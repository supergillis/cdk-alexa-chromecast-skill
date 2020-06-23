import boto3
import pychromecast
import json
import sys
from typing import Optional

if len(sys.argv) != 3:
    print("Usage: poll.py <chromecast_name> <outputs_file>")
    exit(1)

chromecast_name = sys.argv[1]
outputs_path = sys.argv[2]

with open(outputs_path) as outputs_file:
    outputs = json.load(outputs_file)
    outputs = outputs['AlexaChromecast']


class ChromecastController:
    handle: Optional[pychromecast.controllers.media.MediaController]

    def __init__(self):
        self.handle = None

    def _get_handle(self) -> pychromecast.controllers.media.MediaController:
        print(f'Connecting to Chromecast "{chromecast_name}"...')
        if self.handle and not self.handle.is_active:
            self.handle = None
        if self.handle is None:
            try:
                casts = pychromecast.get_chromecasts()
                cast = next(cc for cc in casts if cc.device.friendly_name ==
                            chromecast_name)
                cast.wait()
                handle = cast.media_controller
                if handle.is_active:
                    self.handle = handle
                print(f'Connected to Chromecast {chromecast_name}!')
            except:
                print(f'Cannot connect to Chromecast {chromecast_name}...')
        return self.handle

    def play(self):
        handle = self._get_handle()
        if handle:
            handle.play()
            print('Resumed Chromecast!')
        else:
            print('Not connected to Chromecast...')

    def pause(self):
        handle = self._get_handle()
        if handle:
            handle.pause()
            print('Paused Chromecast!')
        else:
            print('Not connected to Chromecast...')


controller = ChromecastController()


def sqs_handle_message(message):
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


print('Starting to listen for messages...')

sqs = boto3.client(
    'sqs',
    region_name=outputs['Region'],
    aws_access_key_id=outputs['ControllerAccessKeyId'],
    aws_secret_access_key=outputs['ControllerAccessKeySecret'])
sqs_queue_url = outputs['QueueUrl']

# Start polling the queue
sqs_polling(queue_url=sqs_queue_url,
            callback=sqs_handle_message,
            process_all=False)
