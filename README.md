# Alexa Chromecast Controller

## Infrastructure

### Installation

Execute the following command in the `cdk` folder.

    pnpx install
    pnpx cdk deploy \
        --parameters "VendorId=${VENDOR_ID}" \
        --parameters "ClientId=${CLIENT_ID}" \
        --parameters "ClientSecret=${CLIENT_SECRET}" \
        --parameters "RefreshToken=${REFRESH_TOKEN}" \
        --outputs-file deploy.json

## Controller

The controller has to be installed on a device that is running in the same network as the Chromecast.

### Installation

Execute the following command in the `controller` folder.

    python3 -m venv env
    source activate env
    pip install -r requirements.txt

### Running

Execute the following command in the root of the project.

    python controller/poll.py $CHROMECAST_NAME cdk/deploy.json
