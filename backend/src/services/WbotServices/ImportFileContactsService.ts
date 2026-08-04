/* eslint-disable no-await-in-loop */
import { has } from "lodash";
import ExcelJS from "exceljs";
import Contact from "../../models/Contact";
import CheckIsValidContact from "./CheckIsValidContact";
// import CheckContactNumber from "../WbotServices/CheckNumber";

const getCellValue = (value: ExcelJS.CellValue): string | number | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && value.text) return value.text;
    if ("result" in value && value.result !== undefined) {
      return getCellValue(value.result);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map(item => item.text).join("");
    }
    if ("hyperlink" in value && value.hyperlink) return value.hyperlink;
  }
  return String(value);
};

export async function ImportFileContactsService(
  tenantId: number,
  file: Express.Multer.File | undefined,
  tags: string[],
  wallets: string[]
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file?.path as string);
  const worksheet = workbook.worksheets[0];
  const headers: string[] = [];
  const rows: any[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as ExcelJS.CellValue[];

    if (rowNumber === 1) {
      values.slice(1).forEach(value => {
        const header = getCellValue(value);
        headers.push(header ? String(header) : "");
      });
      return;
    }

    const item: any = {};
    values.slice(1).forEach((value, index) => {
      const header = headers[index];
      if (header) item[header] = getCellValue(value);
    });
    rows.push(item);
  });

  const contacts: any = [];

  rows.forEach(row => {
    let name = "";
    let number = "";
    let email = "";

    if (has(row, "nome") || has(row, "Nome")) {
      name = row.nome || row.Nome;
    }

    if (
      has(row, "numero") ||
      has(row, "número") ||
      has(row, "Numero") ||
      has(row, "Número")
    ) {
      number = row.numero || row["número"] || row.Numero || row["Número"];
      number = `${number}`.replace(/\D/g, "");
    }

    if (
      has(row, "email") ||
      has(row, "e-mail") ||
      has(row, "Email") ||
      has(row, "E-mail")
    ) {
      email = row.email || row["e-mail"] || row.Email || row["E-mail"];
    }

    name = name || number;

    if (name && number && number.length >= 10) {
      contacts.push({ name, number, email, tenantId });
    }
  });

  const contactList: Contact[] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const contact of contacts) {
    try {
      // eslint-disable-next-line no-await-in-loop
      // const waNumber = await CheckIsValidContact(
      //   `${contact.number}`,
      //   `${contact.tenantId}`
      // );

      // eslint-disable-next-line no-await-in-loop
      const [newContact, created] = await Contact.findOrCreate({
        where: {
          number: contact.number, // `${waNumber.user}`,
          tenantId: contact.tenantId
        },
        defaults: contact
      });

      const setContact: any = newContact;
      if (created) {
        contactList.push(newContact);
      }

      if (tags?.length) {
        await setContact.setTags(tags, { through: { tenantId } });
      }

      if (wallets?.length) {
        await setContact.setWallets(wallets, { through: { tenantId } });
      }
    } catch (error) {
      console.error(`Número não é uma conta válida ${contact.number}`);
    }
  }

  return contactList;
}
