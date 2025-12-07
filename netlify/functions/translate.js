// netlify/functions/translate.js
// Netlify serverless function for Azure Translator API

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
        
        // Get API credentials from environment variables
        const apiKey = process.env.AZURE_TRANSLATOR_KEY;
        const region = process.env.AZURE_TRANSLATOR_REGION;
        
        if (!apiKey || !region) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Azure Translator credentials not configured on server. Please add AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION environment variables.' 
                })
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

        // Azure Translator API endpoint
        const endpoint = 'https://api.cognitive.microsofttranslator.com';
        
        // Build query parameters
        const params = new URLSearchParams({
            'api-version': '3.0',
            'to': targetLang
        });
        
        // Add source language if specified (otherwise Azure auto-detects)
        if (sourceLang) {
            params.append('from', sourceLang);
        }

        // Prepare request body - Azure expects array of objects with 'text' property
        const requestBody = texts.map(text => ({ text: text }));

        // Call Azure Translator API
        const response = await fetch(`${endpoint}/translate?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Ocp-Apim-Subscription-Region': region,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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
                    error: errorData.error?.message || `Azure Translator API error: ${response.status}`
                })
            };
        }

        const data = await response.json();
        
        // Azure returns array of translation results
        // Format: [{ translations: [{ text: "translated", to: "es" }] }]
        // Convert to match our expected format: { translations: [{ text: "..." }] }
        const translations = data.map(item => ({
            text: item.translations[0].text
        }));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({ translations })
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