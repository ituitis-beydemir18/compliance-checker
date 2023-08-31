import {EC2Client, DescribeInstancesCommand} from '@aws-sdk/client-ec2';
import {DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import {CloudTrailClient, LookupEventsCommand} from '@aws-sdk/client-cloudtrail';
import {SNSClient, PublishCommand} from '@aws-sdk/client-sns';
import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";

import {
    ConfigServiceClient,
    DescribeComplianceByResourceCommand,
} from '@aws-sdk/client-config-service';

const dynamoDb = new DynamoDBClient({region: process.env.AWS_REGION});
const ec2 = new EC2Client({region: process.env.AWS_REGION});
const cloudTrail = new CloudTrailClient({region: process.env.AWS_REGION});
const sns = new SNSClient({region: process.env.AWS_REGION});
const configService = new ConfigServiceClient({region: process.env.AWS_REGION});
const client = new ResourceGroupsTaggingAPIClient({region: process.env.AWS_REGION});

const tagKey = process.env.TAG_KEY;  // the name of the tag
const snsTopicArn = process.env.SNS_TOPIC_ARN;  // the ARN of the SNS topic
const fallbackSnsTopicArn = process.env.FALLBACK_SNS_TOPIC_ARN;  // ????
const dynamoDbTableName = "nonComplianceTable3"

let now = new Date();
now = now.toISOString();



async function publishToSns(message, topicArn) {
    const params = {
        Message: message,
        TopicArn: topicArn,
    };

    try {
        const data = await sns.send(new PublishCommand(params));
        console.log("Message sent to the topic");
        console.log(data);
    } catch (err) {
        console.error(err, err.stack);
    }
}

function convertResourceType(resourceType) {
    const parts = resourceType.split("::");
    const firstPart = parts[1].toLowerCase();
    const secondPart = parts[2].charAt(0).toLowerCase() + parts[2].slice(1).replace(/([A-Z])/g, '-$1').toLowerCase();
    return firstPart + ":" + secondPart;
}
async function scanAndDeleteItems(dynamoDb, tablename) {
    const input = {
        "ExpressionAttributeNames": {
          "#PK": "resource_type-resource_name",
        },
        "ExpressionAttributeValues": {
          ":lct": {
            "S": now
          }
        },
        "FilterExpression": "last_control_time <> :lct",
        "ProjectionExpression": "#PK",
        "TableName": "nonComplianceTable3"
      };
      const command = new ScanCommand(input);
      const response = await dynamoDb.send(command);
      let itemstodelete = response.Items;
      for (let item of itemstodelete) {
        const input = {
            "Key": {
              "resource_type-resource_name": {
                "S":  item["resource_type-resource_name"]["S"]              
              }
            },
            "TableName": tablename
          };
          const command = new DeleteItemCommand(input);
          const response = await dynamoDb.send(command);
          console.log(response);
      }
    
}
async function updateOrPutDataToDynamodb(resource, creatorEvent, dynamoDb, tablename, username) {
    
    if(!creatorEvent || creatorEvent.EventTime == null) {
        creatorEvent = creatorEvent || {}; // If creatorEvent is undefined, create an empty object.
        creatorEvent.EventTime = "not found";
    }


    let S = convertResourceType(resource.ResourceType) + "-" + resource.ResourceId;
    const queryInput = {
        "ExpressionAttributeNames": {
            "#resourceKey": "resource_type-resource_name"
        },
        "ExpressionAttributeValues": {
            ":v1": {
                "S": S
            }
        },
        "KeyConditionExpression": "#resourceKey = :v1",
        "TableName": tablename
    };

    const queryCommand = new QueryCommand(queryInput);
    const queryResponse = await dynamoDb.send(queryCommand);
    const items = queryResponse.Items;

    if (items && items.length > 0) {
        const firstItem = items[0];
        const updateInput = {
            "ExpressionAttributeNames": {
                "#C": "creator",
                "#LCT": "last_control_time"
            },
            "ExpressionAttributeValues": {
                ":c": {
                    "S": username
                },
                ":lct": {
                    "S": now
                }
            },
            "Key": {
                "resource_type-resource_name": {
                    "S": S
                }
            },
            "ReturnValues": "ALL_NEW",
            "TableName": "nonComplianceTable3",
            "UpdateExpression": "SET #C = :c, #LCT = :lct"
        };

        const updateCommand = new UpdateItemCommand(updateInput);
        const updateResponse = await dynamoDb.send(updateCommand);
        console.log(updateResponse);
    } else {
        const putInput = {
            "Item": {
                "resource_type-resource_name": {
                    "S": S
                },
                "creation_date": {
                    "S": creatorEvent.EventTime
                },
                "creator": {
                    "S": username
                },
                "last_control_time": {
                    "S": now
                },
                "resource_name": {
                    "S": resource.ResourceId
                },
                "resource_type": {
                    "S": convertResourceType(resource.ResourceType)
                }
            },
            "ReturnConsumedCapacity": "TOTAL",
            "TableName": "nonComplianceTable3"
        };

        const putCommand = new PutItemCommand(putInput);
        await dynamoDb.send(putCommand);
        console.log("No items found.");
    }
}

export async function handler() {
    try {
        let nextToken;
    
        do {
            const command = new DescribeComplianceByResourceCommand({
                ComplianceTypes: ['NON_COMPLIANT'],
                NextToken: nextToken
            });

            const nonCompliantResources = await configService.send(command);
            nextToken = nonCompliantResources.NextToken;
            for (let resource of nonCompliantResources.ComplianceByResources) {
                console.log(`${resource.ResourceType} ${resource.ResourceId} is non-compliant`);
                
                // Query CloudTrail to find the creator of the resource
                let lookupNextToken;
                let creatorEvent;

                if(resource.ResourceType === 'AWS::DynamoDB::Table')
                {
                    do {
                        const lookupCommand = new LookupEventsCommand({
                            LookupAttributes: [
                                {
                                    AttributeKey: 'EventName',
                                    AttributeValue: 'CreateTable'
                                }
                            ],
                            NextToken: lookupNextToken
                        });

                        let events;
                        let retryCount = 0;
                        const maxRetries = 3;  // Maksimum tekrar sayısı

                        while (retryCount < maxRetries) {
                            try {
                                events = await cloudTrail.send(lookupCommand);
                                break;  // Eğer başarılı olursa döngüden çık.
                            } catch (error) {
                                console.error("Hata oluştu:", error);
                                if (retryCount < maxRetries - 1) {  // Son tekrar öncesi kontrol ediliyor.
                                console.log("1 saniye bekleniyor ve tekrar denenecek.");
                                await new Promise(resolve => setTimeout(resolve, 1000));  // 1 saniye beklemek için.
                                }
                            }
                            retryCount++;
                        }

                        if (retryCount === maxRetries) {
                            console.error("Maksimum tekrar sayısına ulaşıldı, işlem başarısız.");
                        }
                        let eventsList = events.Events;

                        for (let event of eventsList) {
                            if (event.CloudTrailEvent && event.CloudTrailEvent.includes(resource.ResourceId)) {
                                creatorEvent = event;
                                break;
                            }
                        }
                        
                        lookupNextToken = events.NextToken;
                    } while (lookupNextToken);
                }
                else {
                    // 2 ways:
                    //   1. sort results in each iteration, only save the smallest event time
                    // or
                    //   2. save all events in an array, then sort the array
                    // 1: 
                    do {
                        const lookupCommand = new LookupEventsCommand({
                            LookupAttributes: [
                                {
                                    AttributeKey: 'ResourceName',
                                    AttributeValue: resource.ResourceId
                                }
                            ],
                            NextToken: lookupNextToken
                        });
                        const events = await cloudTrail.send(lookupCommand);
                        let eventsList = events.Events;
                        // Sort the events by EventTime
                        eventsList.sort((a, b) => {
                            return new Date(a.EventTime) - new Date(b.EventTime);
                        });
                        if (eventsList && eventsList.length > 0) {
                            if (creatorEvent && eventsList[0].EventTime < creatorEvent.EventTime)
                                creatorEvent = eventsList[0];
                            else if (!creatorEvent)
                                creatorEvent = eventsList[0];
                        }
                        lookupNextToken = events.NextToken;
                    } while (lookupNextToken);
                }
                if (creatorEvent && creatorEvent.Username != "root") {     
                    console.log(`The ${resource.ResourceType} was created by: ${creatorEvent.Username} (${creatorEvent.EventTime}, ${creatorEvent.EventName})`);
                    // Send a message to the creator
                    updateOrPutDataToDynamodb(resource, creatorEvent, dynamoDb, dynamoDbTableName, creatorEvent.Username);
                      

                      
                      
                }
                else {
                    //Check tags
                    let tagsPaginationToken;
                    let developer, responsible;
                    let type = convertResourceType(resource.ResourceType);
                    
                    do {
                        const GetResourcesInput = {
                            ResourceTypeFilters: [type],
                            PaginationToken: tagsPaginationToken
                        };
                        const command = new GetResourcesCommand(GetResourcesInput);
                        const response = await client.send(command);
                        tagsPaginationToken = response.PaginationToken;
                        for (let ResourceOfGroup of response.ResourceTagMappingList) {
                            // Pass if the resource is not the one we are looking for
                            if (!ResourceOfGroup.ResourceARN.includes(resource.ResourceId)) {
                                continue;
                            }
                            for (let tag of ResourceOfGroup.Tags) {
                                if (tag['Key'] == 'Developer') {
                                    developer = tag['Value'];
                                    break;
                                }
                                else if (tag['Key'] == 'Responsible') {
                                    responsible = tag['Value'];
                                    break;
                                }
                            }
                            if (developer) {
                                console.log(`The ${resource.ResourceType} was created by: ${developer}, found in the tags`);
                                updateOrPutDataToDynamodb(resource, creatorEvent, dynamoDb, dynamoDbTableName, developer);
                                
                            }
                            else if (responsible) {
                                console.log(`The ${resource.ResourceType} was created by: ${responsible}, found in the tags`);
                                
                                updateOrPutDataToDynamodb(resource, creatorEvent, dynamoDb, dynamoDbTableName, responsible);
                            }
                        }
                        if (developer || responsible)
                            break;
                    } while (tagsPaginationToken)
                    if (!developer && !responsible) {
                        let message = `Creator Unknown. - No tags or creator found for the ${resource.ResourceType}: ${resource.ResourceId}. `;
                        console.log(message);

                        
                        updateOrPutDataToDynamodb(resource, creatorEvent, dynamoDb, dynamoDbTableName, "not found");
                        // Send a message the fallback topic.
                        //await publishToSns(message, fallbackSnsTopicArn);
                    }
                }
            }
        } while (nextToken);
        scanAndDeleteItems(dynamoDb, dynamoDbTableName)
        
    } catch (err) {
        console.log('Error', err);
        //await publishToSns(`Error in Lambda function: ${err}`, snsTopicArn);
    }
};


handler();