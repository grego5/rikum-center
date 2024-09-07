import pdfToHtml from '../poppler.js';
import { XmlDocument, XmlXPath } from 'libxml2-wasm';
import { Request, Response, NextFunction } from 'express';

const widthAtrPath = new XmlXPath('page/@width');
const textPath = new XmlXPath('page/text');
const topAttrPath = new XmlXPath('@top');
const leftAttrPath = new XmlXPath('@left');

const upload = async (req: Request, res: Response, next: NextFunction) => {
  const { files } = req;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    const startDate = Date.now();

    const result = await Promise.all(
      files.map(async ({ buffer }) => {
        const xmlBuffer = await pdfToHtml(buffer, {
          singlePage: true,
          xmlOutput: true,
          ignoreImages: true,
          stdout: true,
        });

        const xmlDoc = XmlDocument.fromBuffer(xmlBuffer);
        const dataIndexMap: Record<number, number>[] = [{}, {}];
        const docData: { text: string; col: number; row: number }[][] = [];

        const data = {
          timestamp: Date.now(),
          ticket: createTicket(),
          device: createDevice(),
          invitee: createInvitee(),
          customer: createCustomer(),
        };

        const pageWidth = Number(xmlDoc.get(widthAtrPath)?.content);

        for (const textNode of xmlDoc.find(textPath)) {
          const row = Number(textNode.get(topAttrPath)?.content);
          if (row > 700) break;

          const col = Math.round(
            Number(textNode.get(leftAttrPath)?.content) / pageWidth
          );
          const index = dataIndexMap[col][row] || docData.length;
          const textContent = textNode.content;

          if (textContent[0] === ':' || textContent[1] === ':') continue;

          if (!docData[index]) {
            dataIndexMap[col][row] = index;
            docData[index] = [];
          }

          if (index in fieldIndexMap) {
            docData[index].push({ text: textContent, col, row });
            const [k, i, s] = fieldIndexMap[index];
            if (s === undefined && docData[index].length < 2) continue;

            switch (k) {
              case 'customer': {
                data[k][i as keyof Customer].push(reverseText(textContent, s));
                break;
              }
              case 'device': {
                data[k][i as keyof Device].push(reverseText(textContent, s));
                break;
              }
              case 'invitee': {
                data[k][i as keyof Invitee].push(reverseText(textContent, s));
                break;
              }
              case 'ticket': {
                data[k][i as keyof Ticket].push(reverseText(textContent, s));
                break;
              }
            }
          }
        }

        xmlDoc.dispose();
        return data;
      })
    );

    console.log(Date.now() - startDate);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export default upload;

type Contact = {
  name: string[];
  phone_0: string[];
  phone_1: string[];
  city: string[];
  address: string[];
  region: string[];
};

type Customer = {
  number: string[];
} & Contact;

type Invitee = {
  caller: string[];
  other_name: string[];
  other_info: string[];
  time_window: string[];
} & Contact;

type Device = {
  model_name: string[];
  serial_number: string[];
  service_type: string[];
  service_ends: string[];
  info_0: string[];
  info_1: string[];
  info_2: string[];
};

type Ticket = {
  number: string[];
  author: string[];
  status: string[];
  date: string[];
  request_details: string[];
};

const createCustomer = (): Customer => ({
  number: [],
  name: [],
  phone_0: [],
  phone_1: [],
  city: [],
  address: [],
  region: [],
});

const createInvitee = (): Invitee => ({
  caller: [],
  other_name: [],
  other_info: [],
  time_window: [],
  name: [],
  phone_0: [],
  phone_1: [],
  city: [],
  region: [],
  address: [],
});

const createDevice = (): Device => ({
  model_name: [],
  serial_number: [],
  service_type: [],
  service_ends: [],
  info_0: [],
  info_1: [],
  info_2: [],
});

const createTicket = (): Ticket => ({
  number: [],
  status: [],
  author: [],
  date: [],
  request_details: [],
});

const reverseText = (text: string, start: number = 0) => {
  if (!/[\u0590-\u05FF]/.test(text)) return text;
  let reversed = '';
  for (let i = text.length - 1 - start; i >= 0; i--) {
    if (text[i] === ':') continue;
    if (text[i] === ' ') {
      if (text[i + 1] === ' ' || text[i + 1] === ':') continue;
    }
    reversed += text[i];
  }
  return reversed;
};

const fieldIndexMap: Record<
  number,
  [
    'ticket' | 'invitee' | 'device' | 'customer',
    keyof Ticket | keyof Invitee | keyof Customer | keyof Device,
    number?,
  ]
> = {
  4: ['ticket', 'number', 18],
  5: ['ticket', 'status', 7],
  6: ['ticket', 'author'],
  7: ['ticket', 'date'],
  8: ['invitee', 'caller'],
  9: ['device', 'model_name'],
  13: ['invitee', 'other_name'],
  14: ['customer', 'number'],
  15: ['customer', 'name'],
  16: ['customer', 'phone_0'],
  17: ['customer', 'phone_1'],
  18: ['customer', 'address'],
  19: ['customer', 'region'],
  20: ['customer', 'city'],
  21: ['invitee', 'name'],
  22: ['invitee', 'other_name'],
  23: ['invitee', 'phone_0'],
  24: ['invitee', 'phone_1'],
  25: ['invitee', 'city'],
  26: ['invitee', 'region'],
  27: ['invitee', 'other_info'],
  28: ['device', 'info_0'],
  29: ['device', 'info_1'],
  32: ['device', 'serial_number'],
  34: ['ticket', 'request_details'],
  35: ['ticket', 'request_details'],
  36: ['ticket', 'request_details'],
  37: ['ticket', 'request_details'],
  38: ['invitee', 'address'],
  39: ['device', 'service_type'],
  40: ['device', 'info_2'],
  41: ['device', 'service_ends'],
  42: ['invitee', 'time_window'],
};
