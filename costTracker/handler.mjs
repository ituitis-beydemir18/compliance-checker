import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer"; // ES Modules import
import { ConfigServiceClient, PutConfigRuleCommand , DescribeConfigRulesCommand} from "@aws-sdk/client-config-service"; // ES Modules import





const configservice = new ConfigServiceClient({region: "eu-central-1"});
const costexplorer = new CostExplorerClient();

export async function handler() {
    try {
        // Calculate start and end dates for last month
       const currentDate = new Date();
       const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
       const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const formatToAWSDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Step 1: Get the costs
        const params = {
            TimePeriod: {
                Start:     formatToAWSDate(firstDayOfCurrentMonth),
                End:         formatToAWSDate(lastDayOfCurrentMonth)
            },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [ // GroupDefinitions
                { // GroupDefinition
                    Type: 'DIMENSION',
                    Key: 'SERVICE'
                },
            ],
        };
        const command = new GetCostAndUsageCommand(params);
        const costData = await costexplorer.send(command);
        const servicesOverThreshold = [];
        let ec2cost = 0;

        costData.ResultsByTime[1].Groups.forEach(group => {
            const serviceName = group.Keys[0];
            const serviceCost = parseFloat(group.Metrics.UnblendedCost.Amount);
            if(serviceName ==='EC2 - Other')
            {
                ec2cost = ec2cost + serviceCost;
            }
            if(serviceName ==='Amazon Elastic Compute Cloud - Compute')
            {
                ec2cost = ec2cost + serviceCost;
            }

            // Step 2: Compare costs
            if (serviceCost > 1.00) {
                servicesOverThreshold.push(serviceName);
            }
        });
        if(ec2cost > 1.00){
            servicesOverThreshold.push('AWS EC2 Instance');
        }
        if (servicesOverThreshold.length > 0) {

            const inputsamplefordescribeConfigRulescommand = {
                ConfigRuleNames: ["required-tags"] 
            }
            const command = new DescribeConfigRulesCommand(inputsamplefordescribeConfigRulescommand);
            const metaData = await configservice.send(command);

            let configrulescopeservices= metaData.ConfigRules[0].Scope.ComplianceResourceTypes;
            let deneme = "AWS::ACM::Certificate"
            
            const input = { // PutConfigRuleRequest
                ConfigRule: { // ConfigRule
                  ConfigRuleName: "required-tags2",

                  Description: "sample rule",
                  Scope: { // Scope
                    ComplianceResourceTypes: [ // ComplianceResourceTypes
                      deneme,
                    ],
                    
                  },
                  Source: { // Source
                    Owner: "AWS" ,
                    SourceIdentifier: "REQUIRED_TAGS",
                    
                    
                    /*CustomPolicyDetails: { // CustomPolicyDetails
                      PolicyRuntime: "STRING_VALUE", // required
                      PolicyText: "STRING_VALUE", // required
                      EnableDebugLogDelivery: true || false,
                    },*/
                  },
                  InputParameters: '{"tag1Key": "AWS::ACM::Certificate"}'
                    ,
                  //MaximumExecutionFrequency: "One_Hour" || "Three_Hours" || "Six_Hours" || "Twelve_Hours" || "TwentyFour_Hours",
                  //ConfigRuleState: "ACTIVE" || "DELETING" || "DELETING_RESULTS" || "EVALUATING",
                  //CreatedBy: "STRING_VALUE",
                  EvaluationModes: [ // EvaluationModes
                    { // EvaluationModeConfiguration
                      Mode: "DETECTIVE" ,
                    },
                  ],
                },
                
              };
              const command2 = new PutConfigRuleCommand(input);
              const response = await configservice.send(command2);

              let a = 1;
            

            
        }

        return `Services over threshold: ${servicesOverThreshold.join(', ')}`;

    } catch (error) {
        console.error("An error occurred:", error);
        throw error;
    }
};
handler();
