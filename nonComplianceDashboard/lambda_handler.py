import traceback
import boto3
import os

html_top1 = '''
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <title>Non-Compliance Checker</title>
        <link rel='stylesheet' href='nonComplianceChecker.css'>
        <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'>
        <!-- Add style -->

    </head>
    <body>
        <div class='container'>
            <h1 class='mt-4'>Non-Compliance Checker</h1>
            <script>
                function invokeLambda() {
                    fetch('https://m3qrp7f1l3.execute-api.eu-central-1.amazonaws.com/default/ComplianceCheckerTerraforn', { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                        alert('Lambda function invoked successfully!');
                        location.reload(); 
                    })
                    .catch(error => {
                        console.error('Error invoking Lambda:', error);
                        alert('Error invoking Lambda. Check the console for more information.');
                        location.reload(); 
                    });
                }
            </script>

            <!-- Button to trigger the Lambda function -->
        <button id="invokeButton" class="btn btn-primary mt-3" onclick="invokeLambda()">Trigger Compliance Checker</button>            
'''


html_bottom = '''
            </tbody>
        </table>
    </div>
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


def lambda_handler(event, context):
    try:
        # Get data from the table
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])

        print('Attempting to read the data from the table.')
        response = table.scan()
        non_compliant_resources = response['Items']
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            non_compliant_resources.extend(response['Items'])

        # Generate the html file
        html = html_top1
        count = str(len(non_compliant_resources))
        html += f'''<h2 class="mt-4">Count: {count}</h2>
        <div class="table-responsive">
            <table class="table table-bordered mt-3">
            <thead>
                <tr>
                    <th>Creator</th>
                    <th>Resource Type</th>
                    <th>Resource Name</th>
                    <th>Creation Date</th>
                    <th>Last Control Time</th>
                </tr>
            </thead>
            <tbody>'''
        for ncr in non_compliant_resources:
            html += create_row(ncr['creator'], ncr['resource_type'], ncr['resource_name'], ncr['creation_date'], ncr['last_control_time'])
        html += html_bottom

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/html'
            },
            'body': html
        }


    except Exception:
        return {
            'statusCode': 500,
            'body': traceback.format_exc()
        }
