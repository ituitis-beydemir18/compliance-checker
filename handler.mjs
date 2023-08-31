import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
    ConfigServiceClient,
    DescribeComplianceByResourceCommand,
    ListDiscoveredResourcesCommand
} from '@aws-sdk/client-config-service';

const ec2 = new EC2Client({ region: process.env.AWS_REGION });
const cloudTrail = new CloudTrailClient({ region: process.env.AWS_REGION });
const sns = new SNSClient({ region: process.env.AWS_REGION });
const configService = new ConfigServiceClient({ region: process.env.AWS_REGION });

const tagKey = process.env.TAG_KEY;  // the name of the tag
const snsTopicArn = process.env.SNS_TOPIC_ARN;  // the ARN of the SNS topic

async function publishToSns(message) {
    const params = {
        Message: message,
        TopicArn: snsTopicArn,
    };

    try {
        const data = await sns.send(new PublishCommand(params));
        console.log("Message sent to the topic");
        console.log(data);
    } catch (err) {
        console.error(err, err.stack);
    }
}

export async function handler() {
    try {
        const command = new DescribeComplianceByResourceCommand({
            ComplianceTypes: ['NON_COMPLIANT'],
        });

        const nonCompliantResources = await configService.send(command);

        console.log("nonCompliantResources", nonCompliantResources)

        for (let resource of nonCompliantResources.ComplianceByResources) {
            console.log(`${resource.ResourceType} ${resource.ResourceId} is non-compliant`);

            // Query CloudTrail to find the creator of the instance
            const lookupCommand = new LookupEventsCommand({
                LookupAttributes: [
                    {
                        AttributeKey: 'ResourceName',
                        AttributeValue: resource.ResourceId
                    }
                ]
            });

            const events = await cloudTrail.send(lookupCommand);

            if (events.Events && events.Events.length > 0) {
                const creatorEvent = events.Events.find(event => event.EventName === 'RunInstances');
                if (creatorEvent) {
                    console.log(`The ${resource.ResourceType} was created by: ${creatorEvent.Username} (${creatorEvent.EventTime})`);
                } else {
                    console.log(`Couldn't find the creator for ${resource.ResourceType}: ${resource.ResourceId}`);
                }
            } else {
                console.log(`No events found for the ${resource.ResourceType}: ${resource.ResourceId}`);
            }
        }
    } catch (err) {
        console.log('Error', err);
        //await publishToSns(`Error in Lambda function: ${err}`);
    }
};
