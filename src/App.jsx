import { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/predict', formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: 'Something went wrong' });
    }
  };

  const startWebcam = () => {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      document.body.appendChild(video);  // Displays webcam feed on the page
    })
    .catch(err => console.error('Webcam error:', err));
};


  return (
    <div>
      <h1>ASL Sign Recognizer</h1>
      <input type="file" onChange={handleFileChange} accept="video/*" />
      <button onClick={handleSubmit}>Predict Sign</button>
      {result && (
        <p>Predicted Sign: {result.sign || result.error} (Confidence: {result.confidence})</p>
      )}
    </div>
  );
}

export default App;
