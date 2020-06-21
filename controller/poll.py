import boto3
import pychromecast
import json
import sys

chromecast_name = sys.argv[1]

print(f'Connecting to Chromecast "{chromecast_name}""...')

casts = pychromecast.get_chromecasts()
cast = next(cc for cc in casts if cc.device.friendly_name == chromecast_name)
cast.wait()
controller = cast.media_controller

with open(sys.argv[2]) as config_file:
    config = json.load(config_file)
    config = config['AlexaChromecast']

print('Starting to listen for messages...')

sqs = boto3.client(
    'sqs',
    region_name=config['Region'],
    aws_access_key_id=config['ControllerAccessKeyId'],
    aws_secret_access_key=config['ControllerAccessKeySecret'])
sqs_queue_url = config['QueueUrl']


def handle_message(message):
    command = message['Body']
    print(f'Executing command "{command}"')

    if command == 'PAUSE':
        controller.pause()
    elif command == 'RESUME':
        controller.play()
    else:
        print(f'Unknown command "{command}"')
    return True


def sqs_polling(queue_url, callback, process_all=False):
    # Long poll for message on provided SQS queue
    while True:
        receive_message = sqs.receive_message(
            QueueUrl=sqs_queue_url,
            AttributeNames=['SentTimestamp'],
            MaxNumberOfMessages=10,
            MessageAttributeNames=['All'],
            WaitTimeSeconds=20)
        messages = receive_message.get('Messages')
        if not messages:
            print('No messages...')
            continue

        if not process_all:
            processed_messages = messages[:-1]
            if callback(messages[-1]):
                processed_messages.append(messages[-1])
        else:
            processed_messages = []
            for message in messages:
                if callback(message):
                    processed_messages.append(message)

        # Build a delete message batch
        delete_batch = [{
            'Id': message['MessageId'],
            'ReceiptHandle': message['ReceiptHandle']
        } for message in processed_messages]

        # Delete received messages in batch
        sqs.delete_message_batch(
            QueueUrl=sqs_queue_url,
            Entries=delete_batch)


# Start polling the queue
sqs_polling(queue_url=sqs_queue_url,
            callback=handle_message,
            process_all=False)
