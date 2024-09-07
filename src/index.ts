import express, { NextFunction, Response, Request } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import multer, { FileFilterCallback } from 'multer';
import * as routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 104200 },
  fileFilter,
});

app.post('/upload', upload.array('files', 100), routes.upload);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    console.error(err);
    if (err instanceof multer.MulterError) {
      return res.status(400).send(`Multer Error: ${err.message}`);
    }
    return res.status(500).send(`Server Error: ${err.message}`);
  }
  next();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
