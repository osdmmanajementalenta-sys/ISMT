import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oldFolderName, newFolderName } = req.body;

  if (!oldFolderName || !newFolderName) {
    return res.status(400).json({ error: 'Missing oldFolderName or newFolderName' });
  }

  // Get the Google Apps Script Web App URL from environment
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  
  if (!scriptUrl) {
    return res.status(500).json({ 
      error: 'Google Apps Script URL not configured',
      message: 'Please set GOOGLE_APPS_SCRIPT_URL in .env.local'
    });
  }

  try {
    console.log('Renaming folder:', { oldFolderName, newFolderName });
    console.log('Script URL:', scriptUrl);
    
    // Create form data for Google Apps Script
    const formData = new URLSearchParams();
    formData.append('action', 'rename');
    formData.append('oldFolderName', oldFolderName);
    formData.append('newFolderName', newFolderName);

    console.log('Sending request to Google Apps Script...');

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('Response status:', response.status);
    
    // Get response as text first
    const responseText = await response.text();
    console.log('Response text:', responseText);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return res.status(500).json({ 
        error: 'Invalid response from Google Apps Script',
        details: responseText
      });
    }
    
    console.log('Parsed result:', result);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.message || 'Failed to rename folder',
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Folder renamed successfully',
      data: result.data
    });

  } catch (error) {
    console.error('Error renaming folder:', error);
    return res.status(500).json({ 
      error: 'Failed to rename folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
