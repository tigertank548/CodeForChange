import { useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { ElevenLabsClient, ElevenLabsEnvironment } from '@elevenlabs/elevenlabs-js';

function Reader() {
    const [messages, setMessages] = useState([]);

    const conversation = useConversation({
        onConnect: () => console.log('Connected to Reader Agent'),
        onMessage: (message) => {
            console.log('Message:', message);
            if (message.type === 'agent_response') {
                setMessages(prev => [...prev, { type: 'agent', text: message.message }]);
            } else if (message.type === 'user_transcript') {
                setMessages(prev => [...prev, { type: 'user', text: message.message }]);
            }
        },
        onError: (error) => console.error('Error:', error),
        onStatusChange: (status) => console.log('Status:', status),
    });

    const startConversation = async () => {
        try {
            await conversation.startSession({
                agentId: 'agent-key',
            });
        } catch (error) {
            console.error('Failed to start:', error);
        }
    };

    const endConversation = () => {
        conversation.endSession();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        // Only allow text-based files
        const textTypes = [
            'text/plain',
            'application/json',
            'application/xml',
            'text/csv',
            'text/html',
            'application/javascript',
            'application/x-javascript',
            'application/x-www-form-urlencoded',
            'application/x-yaml',
            'text/markdown',
            'text/xml',
            'text/css',
        ];
        if (!textTypes.includes(file.type)) {
            setMessages(prev => [...prev, { type: 'system', text: 'Only text-based files can be uploaded to the knowledge base.' }]);
            return;
        }
        try {
            const content = await file.text();
            const client = new ElevenLabsClient({
                apiKey: 'api-key',
                environment: ElevenLabsEnvironment.Production,
            });
            await client.conversationalAi.knowledgeBase.documents.createFromText({
                text: content,
                name: file.name,
            });
            setMessages(prev => [...prev, { type: 'system', text: `File "${file.name}" added to knowledge base.` }]);
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessages(prev => [...prev, { type: 'system', text: 'Failed to add file to knowledge base.' }]);
        }
    };

    return (
        <div>
            <button onClick={startConversation} disabled={conversation.status === 'connected'}>
                Start Conversation
            </button>
            <button onClick={endConversation} disabled={conversation.status !== 'connected'}>
                End Conversation
            </button>
            <p>Status: {conversation.status}</p>
            <div>
                <input type="file" onChange={handleFileUpload} />
                <p>Upload a text-based file to add it to the agent's knowledge base.</p>
            </div>
            <div>
                {messages.map((msg, index) => (
                    <p key={index}><strong>{msg.type}:</strong> {msg.text}</p>
                ))}
            </div>
        </div>
    );
}

export default Reader;