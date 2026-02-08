import React from 'react';
import { Upload, X } from 'lucide-react';

const ParentZone = ({
    showSettings,
    setShowSettings,
    selectedFile,
    setSelectedFile,
    uploadStatus,
    setUploadStatus,
    textInput,
    setTextInput,
    handleUpload
}) => {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setTextInput(''); // Clear text input when file is selected
        setUploadStatus('');
    };

    if (!showSettings) return null;

    return (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-blue-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Parent Zone 🔒</h2>
                    <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* File Upload Section */}
                <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 flex flex-col items-center gap-2 text-center">
                        <Upload size={32} className="text-blue-400" />
                        <p className="text-sm text-gray-600 font-medium">Upload Story Text</p>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            disabled={textInput.trim() !== ''}
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Text Input Section */}
                    <div className="p-4 border-2 border-dashed border-green-300 rounded-xl bg-green-50 flex flex-col items-center gap-2 text-center">
                        <p className="text-sm text-gray-600 font-medium">Or Paste Text Here</p>
                        <textarea
                            value={textInput}
                            onChange={(e) => {
                                setTextInput(e.target.value);
                                setSelectedFile(null); // Clear file selection when text is entered
                            }}
                            disabled={!!selectedFile}
                            placeholder="Paste your story text here..."
                            className="w-full h-32 p-2 border border-gray-300 rounded-lg resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {uploadStatus && (
                        <p className={`text-center text-sm font-bold ${uploadStatus.includes('Success') ? 'text-green-600' : (uploadStatus.includes('Error') || uploadStatus.includes('failed')) ? 'text-red-500' : 'text-blue-600'}`}>
                            {uploadStatus}
                        </p>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile && !textInput.trim()}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Upload to Agent
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParentZone;