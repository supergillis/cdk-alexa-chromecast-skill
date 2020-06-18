import boto3
import pychromecast

chromecast_name = 'Living Room TV'
queue_url = 'https://sqs.us-east-1.amazonaws.com/807189921296/AlexaChromecast-Queue'

chromecasts = pychromecast.get_chromecasts()
cast = next(
    cc for cc in chromecasts if cc.device.friendly_name == chromecast_name)
cast.wait()

mc = cast.media_controller

print('active')

sqs = boto3.client('sqs')

# Long poll for message on provided SQS queue
while True:
    receive_message = sqs.receive_message(
        QueueUrl=queue_url,
        AttributeNames=[
            'SentTimestamp'
        ],
        MaxNumberOfMessages=10,
        MessageAttributeNames=[
            'All'
        ],
        WaitTimeSeconds=20
    )
    messages = receive_message.get('Messages')
    if not messages:
        print('No messages...')
        continue

    last_message = messages[-1]
    last_body = last_message['Body']
    if last_body == 'PAUSE':
        mc.pause()
    elif last_body == 'RESUME':
        mc.play()

    delete_batch = []
    for message in messages or []:
        delete_batch.append({'Id': message['MessageId'],
                             'ReceiptHandle': message['ReceiptHandle']})
    if delete_batch:
        sqs.delete_message_batch(QueueUrl=queue_url, Entries=delete_batch)
