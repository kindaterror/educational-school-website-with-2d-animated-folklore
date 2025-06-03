// == IMPORTS & DEPENDENCIES ==
import { promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import type { IncomingMessage, ServerResponse } from 'http';

// == API CONFIGURATION ==
export const config = {
  api: {
    bodyParser: false,
  },
};

// == UTILITY FUNCTIONS ==
async function buffer(readable: Readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// == MAIN API HANDLER ==
export default async function handler(
  req: IncomingMessage & { query?: any }, 
  res: ServerResponse & { status?: (code: number) => any, json?: (data: any) => any }
) {
  
  // == RESPONSE HELPERS ==
  if (!res.status) {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }
  
  if (!res.json) {
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // == METHOD VALIDATION ==
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // == INPUT VALIDATION ==
    const query = req.query || {};
    const filePath = query.path;
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ success: false, error: 'No file path specified' });
    }

    // == FILE PROCESSING ==
    const data = await buffer(req);
    
    // == DIRECTORY CREATION ==
    const dir = path.join(process.cwd(), 'public', path.dirname(filePath));
    await fs.mkdir(dir, { recursive: true });
    
    // == FILE UPLOAD ==
    const destinationPath = path.join(process.cwd(), 'public', filePath);
    await fs.writeFile(destinationPath, data);
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({ 
      success: true, 
      filePath: filePath 
    });
    
  } catch (error) {
    // == ERROR HANDLING ==
    console.error('Upload error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error uploading file' 
    });
  }
}