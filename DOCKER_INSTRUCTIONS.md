# Docker Instructions for Chefie Pie

## Prerequisites
- Ensure **Docker Desktop** is installed and **running** on your machine.
- You should see the Docker whale icon in your system tray.

## Step 1: Build the Image
Open a terminal in the project root (`C:\Docker\U2100555_MuhdSalihin_AA\ChefiePie_ContainerizedDocker`) and run:

```powershell
docker build -t chefiepie .
```

*Note: This may take a few minutes the first time as it downloads the Node.js base image and installs dependencies.*

## Step 2: Run the Container
Once the build is complete, run the container mapping port 5000:

```powershell
docker run -p 5000:5000 chefiepie
```

## Step 3: Verify
Open your web browser and navigate to:
[http://localhost:5000](http://localhost:5000)

You should see your Chefie Pie app running!

## Troubleshooting
- **"error during connect"**: Make sure Docker Desktop is started.
- **Port already in use**: If port 5000 is taken, change the command to `-p 5001:5000` and visit port 5001.
