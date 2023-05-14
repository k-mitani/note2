import * as fs from 'fs';

const NOTEBOOK_ROOT_DIR = 'notebooks';

function getStacks(): string[] {
  const stacks = fs.readdirSync(NOTEBOOK_ROOT_DIR);
  return stacks;
}

function getNotebooks(stackName: string): string[] {
  const notebooks = fs.readdirSync(`${NOTEBOOK_ROOT_DIR}/${stackName}`);
  return notebooks;
}

function getNotes(stackName: string, notebookName: string): any[] {
  const prefix = `${NOTEBOOK_ROOT_DIR}/${stackName}/${notebookName}/`
  const notePaths = fs.readdirSync(prefix);
  const notes = notePaths.map(notePath => {
    var jsonText = fs.readFileSync(`${prefix}/${notePath}`, 'utf-8');
    var json = JSON.parse(jsonText);
    return json;
  });
  return notes;
}

export default {
  getStacks,
  getNotebooks,
  getNotes,
};