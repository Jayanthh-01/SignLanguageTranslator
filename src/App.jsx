// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://127.0.0.1:8000';

function App() {
  // Live stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [signs, setSigns] = useState([]);
  const [sentence, setSentence] = useState('');
  const videoRef = useRef(null);
  const ws = useRef(null);
  const streamInterval = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // New state for audio control

  // Video upload state
  const [uploadStatus, setUploadStatus] = useState('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState('');
  const fileInputRef = useRef(null);

  // --- Live Stream Logic ---
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setIsStreaming(true);
      
      // Connect to WebSocket
      ws.current = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/interpret`);
      
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setSigns(data.signs);
        setSentence(data.sentence);
        
        if (data.audio_url && isAudioEnabled) {
          const audio = new Audio(`${API_BASE_URL}${data.audio_url}`);
          audio.play();
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed.");
        setIsStreaming(false);
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      streamInterval.current = setInterval(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            ws.current.send(blob);
          }, 'image/jpeg');
        }
      }, 100);

    } catch (error) {
      console.error("Could not start stream:", error);
    }
  };

  const stopStream = () => {
    clearInterval(streamInterval.current);
    if (ws.current) {
      ws.current.close();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsStreaming(false);
    setSigns([]);
    setSentence('');
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  // --- Video Upload Logic ---
  const handleUpload = async () => {
    const file = fileInputRef.current.files[0];
    if (!file) {
      setUploadStatus("Please select a video file.");
      return;
    }

    setUploadStatus("Uploading and processing video... Please wait.");
    setProcessedVideoUrl('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      setProcessedVideoUrl(`${API_BASE_URL}${data.processed_video_url}`);
      
      if (isAudioEnabled) {
        const audio = new Audio(`${API_BASE_URL}${data.audio_url}`);
        audio.play();
      }

      setUploadStatus(`Success! Sentence: ${data.sentence}`);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(`Failed to process video: ${error.message}`);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>ASL Recognition App</h1>
        <p>Live Recognition & Video Uploads</p>
      </header>

      <main>
        <section className="live-section">
          <h2>Live Interpretation</h2>
          <div className="video-container">
            <video ref={videoRef} autoPlay playsInline muted={true}></video>
          </div>
          <div className="controls">
            <button onClick={startStream} disabled={isStreaming}>Start Live Stream</button>
            <button onClick={stopStream} disabled={!isStreaming}>Stop Live Stream</button>
            <label>
                <input type="checkbox" checked={isAudioEnabled} onChange={() => setIsAudioEnabled(!isAudioEnabled)} />
                Enable Audio
            </label>
          </div>
          <div className="output-container">
            <h3>Detected Signs:</h3>
            <p>{signs.length > 0 ? signs.join(', ') : 'No signs detected yet.'}</p>
            <h3>Generated Sentence:</h3>
            <p>{sentence || 'Waiting for signs...'}</p>
          </div>
        </section>

        <section className="upload-section">
          <h2>Video Upload</h2>
          <p>Upload a video file for processing.</p>
          <input type="file" ref={fileInputRef} accept="video/*" />
          <button onClick={handleUpload}>Upload & Process</button>
          <div className="output-container">
            <h3>Processed Video:</h3>
            {processedVideoUrl && <video src={processedVideoUrl} controls />}
            <div className="message-box">
              <p>{uploadStatus}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;