import React, { useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';

const DefinitionModal = ({ word, onClose }) => {
    const [definition, setDefinition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!word) return;

        const fetchDefinition = async () => {
            setLoading(true);
            setDefinition(null);
            setError(null);
            try {
                const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                if (!response.ok) {
                    throw new Error('Could not find a definition for this word.');
                }
                const data = await response.json();
                setDefinition(data[0]);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDefinition();
    }, [word]);

    const playAudio = () => {
        if (definition?.phonetics) {
            const audioEntry = definition.phonetics.find(p => p.audio);
            if (audioEntry?.audio) {
                const audio = new Audio(audioEntry.audio);
                audio.play();
            }
        }
    };

    return (
        <div 
            className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-blue-100 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-gray-800 capitalize">{word}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {loading && <p className="text-center text-gray-500">Loading definition...</p>}
                {error && <p className="text-center text-red-500">{error}</p>}
                
                {definition && (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div className="flex items-center gap-4 text-gray-500">
                            <span className="font-medium">{definition.phonetic}</span>
                            {definition.phonetics.some(p => p.audio) && (
                                <button onClick={playAudio} className="p-2 hover:bg-blue-50 rounded-full">
                                    <Volume2 size={22} className="text-blue-500" />
                                </button>
                            )}
                        </div>
                        {definition.meanings.map((meaning, index) => (
                            <div key={index} className="border-t pt-4">
                                <h3 className="text-lg font-semibold italic text-blue-600">{meaning.partOfSpeech}</h3>
                                {meaning.definitions.map((def, i) => (
                                    <div key={i} className="mt-2 pl-4">
                                        <p className="text-gray-700">{def.definition}</p>
                                        {def.example && (
                                            <p className="text-sm text-gray-500 italic mt-1">e.g. "{def.example}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Adding a simple fade-in animation for the modal
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out forwards;
}
`;
document.head.appendChild(styleSheet);


export default DefinitionModal;
