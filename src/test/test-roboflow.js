const axios = require('axios');
const fs = require('fs');

async function testRoboflow() {
  try {
    // Read a test image and convert to base64
    const imageBuffer = fs.readFileSync('rrr.png');
    const base64Image = imageBuffer.toString('base64');

    console.log('🔍 Testing Roboflow API...');

    const response = await axios({
      method: 'POST',
      url: 'https://detect.roboflow.com/chefiepie-ingredients-detector-h4erh/1',
      params: {
        api_key: 'QFB6tBYDeXZj6uBIkqQN',
        confidence: 40,
        overlap: 30,
      },
      data: base64Image,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ Success!');
    console.log('Predictions:', response.data.predictions);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testRoboflow();