import React, { useState, useEffect } from 'react';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('http://localhost:3200/files');
      const data = await res.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Failed to fetch files', error);
    }
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('logfile', uploadFile);

    try {
      const res = await fetch('http://localhost:3200/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setUploadStatus('Upload successful!');
      setUploadFile(null);
      fetchFiles();
    } catch (error) {
      setUploadStatus('Upload failed.');
      console.error(error);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setAnalysisResult('');
    try {
      const res = await fetch('http://localhost:3200/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: selectedFile }),
      });
      const data = await res.json();
      if (data.result) {
        setAnalysisResult(data.result);
      } else {
        setAnalysisResult('Failed to get analysis.');
      }
    } catch (error) {
      setAnalysisResult('Error during analysis.');
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>LogBot</h1>
      
      <section>
        <h2>Upload Log File</h2>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={!uploadFile}>Upload</button>
        <p>{uploadStatus}</p>
      </section>

      <section>
        <h2>Uploaded Files</h2>
        <ul>
          {files.length === 0 && <li>No files uploaded yet.</li>}
          {files.map((fileKey) => (
            <li key={fileKey}>
              <label>
                <input
                  type="radio"
                  name="selectedFile"
                  value={fileKey}
                  checked={selectedFile === fileKey}
                  onChange={() => setSelectedFile(fileKey)}
                />
                {fileKey}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <button onClick={handleAnalyze} disabled={!selectedFile || loading}>
          {loading ? 'Analyzing...' : 'Analyze Selected File'}
        </button>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>{analysisResult}</pre>
      </section>
    </div>
  );
}

export default App;
