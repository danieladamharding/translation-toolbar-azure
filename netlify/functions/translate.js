// netlify/functions/translate.js
// Netlify serverless function for DeepL translation

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const { texts, sourceLang, targetLang } = JSON.parse(event.body);
        
        // Get API key from environment variable
        const apiKey = process.env.DEEPL_API_KEY;
        
        if (!apiKey) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'API key not configured on server' })
            };
        }

        // Validate input
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'texts array is required' })
            };
        }
        if (!targetLang) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'targetLang is required' })
            };
        }
        if (!apiKey) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'apiKey is required' })
            };
        }

        // Determine API endpoint based on key type
        const isFreeKey = apiKey.endsWith(':fx');
        const apiUrl = isFreeKey 
            ? 'https://api-free.deepl.com/v2/translate'
            : 'https://api.deepl.com/v2/translate';

        // Build request body
        const params = new URLSearchParams();
        texts.forEach(text => params.append('text', text));
        params.append('target_lang', targetLang);
        if (sourceLang) {
            params.append('source_lang', sourceLang);
        }

        // Call DeepL API using built-in fetch
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: errorData.message || `DeepL API error: ${response.status}`
                })
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Translation error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ 
                error: error.message || 'Internal server error' 
            })
        };
    }
};