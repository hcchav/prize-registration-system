import { useState } from 'react';

interface ComicAuthCodeProps {
  prizeId: string;
  userName: string;
}

export default function ComicAuthCode({ prizeId, userName }: ComicAuthCodeProps) {
  const [authCode, setAuthCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  const generateAuthCode = async () => {
    try {
      setIsGenerating(true);
      setError('');
      
      // TODO: Replace with actual API call
      const response = await fetch('/api/generate-comic-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prizeId,
          userName,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAuthCode(data.authCode);
      } else {
        setError('Failed to generate authentication code');
      }
    } catch (err) {
      setError('An error occurred while generating the code');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
      <h3 className="text-xl font-bold text-blue-900 mb-3">Comic Book Authentication</h3>
      
      {!authCode ? (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Generate your unique authentication code to verify your comic book's authenticity.
          </p>
          <button
            onClick={generateAuthCode}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isGenerating ? 'Generating...' : 'Generate Auth Code'}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Your Authentication Code:</p>
          <div className="bg-white p-3 rounded-md border-2 border-blue-200">
            <code className="text-lg font-mono font-bold text-blue-900">{authCode}</code>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Keep this code safe! You'll need it to verify your comic book's authenticity.
          </p>
        </div>
      )}
      
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
} 