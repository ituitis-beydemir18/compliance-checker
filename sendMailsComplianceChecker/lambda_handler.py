import traceback
import boto3
import json

class os:
    environ = {
        'DYNAMODB_TABLE_NAME_NONCOMPLIANCE': 'nonComplianceTable3',
        'DYNAMODB_TABLE_NAME_USERS': 'excel-test-table',
        'ADMIN_EMAIL': 'arda.sesen@commencis.com',
        'SENDER': 'compliance@commencis.cloud'
    }

email_detection_string = '@'

html_top1 = '''
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <title>Non-Compliance Checker</title>
        <link rel='stylesheet' href='nonComplianceChecker.css'>
        <!-- Add style -->
        <style>
            table, th, td {
                border: 1px solid black;
                text-align: center;
            }
        </style>
    </head>
    <body>
'''


html_bottom = '''
        </table>
    </div>
</html>
'''

def create_row(creator, resource_type, resource_name, creation_date, last_control_time):
    return f'''
                <tr>
                    <td>{creator}</td>
                    <td>{resource_type}</td>
                    <td>{resource_name}</td>
                    <td>{creation_date}</td>
                    <td>{last_control_time}</td>
                </tr>
    '''

def create_html(resourceList: list):
    # Generate the html file
    html = html_top1
    count = str(len(resourceList))
    html += f'''<h2>Count: {count}</h2>
        <table>
            <tr>
                <th>Creator</th>
                <th>Resource Type</th>
                <th>Resource Name</th>
                <th>Creation Date</th>
                <th>Last Control Time</th>
            </tr>'''
    for ncr in resourceList:
        html += create_row(ncr['creator'], ncr['resource_type'], ncr['resource_name'], ncr['creation_date'], ncr['last_control_time'])
    html += html_bottom
    return html



def create_mail(creator, resources: list):
    # Generate the mail body
    mail_body = f'''Dear {creator},

    You have created the following resources without the necessary tags. 
    '''
    for resource in resources:
        mail_body += f'''
        {resource['resource_type']}: {resource['resource_name']} - Creation Date: {resource['creation_date']}
        '''
    
    mail_body += f'''
    The last control time was {resources[0]['last_control_time']}. 
    Please add the required tags to the resources as soon as possible.

    Best regards,
    Your Compliance Team
    '''
    return mail_body

def send_maid_aws_ses(receiver:str, mail_body: str, is_html: bool):
    # send mail
    ses = boto3.client('ses')
    response = ses.send_email(
        Source=os.environ['SENDER'],
        Destination={
            'ToAddresses': [
                receiver,
            ]
        },
        Message={
            'Subject': {
                'Data': 'Non-Compliant Resources',
                'Charset': 'UTF-8'
            },
            'Body': {
                'Html' if is_html else 'Text': {
                    'Data': mail_body,
                    'Charset': 'UTF-8'
                }
            }
        }
    )
    # print(json.dumps(response, indent=2))


def get_email_from_username(username: str):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME_USERS'])
    response = table.get_item(
        Key={
            'username': username
        },
        AttributesToGet=[
            'email'
        ]
    )
    if 'Item' not in response or 'email' not in response['Item']:
        return None
    return response['Item']['email']


def lambda_handler(event, context):
    try:
        # Get data from the table
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME_NONCOMPLIANCE'])

        print('Attempting to read the data from the table.')
        response = table.scan()
        non_compliant_resources = response['Items']
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            non_compliant_resources.extend(response['Items'])

        resourcesWithUnknownCreators = list()
        resourcesWithCreators = dict()

        for ncr in non_compliant_resources:
            if email_detection_string in ncr['creator']:
                if ncr['creator'] not in resourcesWithCreators:
                    resourcesWithCreators[ncr['creator']] = list()
                resourcesWithCreators[ncr['creator']].append(ncr)

            else:
                resourcesWithUnknownCreators.append(ncr)

        # send mail to the creators
        for creator in resourcesWithCreators:
            resources = resourcesWithCreators[creator]
            mail_body = create_mail(creator, resources)
            # send mail
            receiver = get_email_from_username(creator)
            if receiver is not None:
                send_maid_aws_ses(creator, mail_body, False)
            else:
                print(f'Could not find the email of the user {creator}. Adding the resources to the unknown list.')
                resourcesWithUnknownCreators.extend(resources)

        # Generate the html file
        unknown_resources_mail_html = create_html(resourcesWithUnknownCreators)

        # send mail to the admin
        #send_maid_aws_ses(os.environ['ADMIN_EMAIL'], unknown_resources_mail_html, True)#

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/html'
            },
            'body': unknown_resources_mail_html
        }


    except Exception as e:
        print(traceback.format_exc())
        return {
            'statusCode': 500,
            'body': traceback.format_exc()
        }

if __name__ == '__main__':
    lambda_handler(1, 2)