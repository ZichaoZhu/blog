import fs from 'fs';
import path from 'path';
import type { Author } from '@/types';

const authorsDirectory = path.join(process.cwd(), 'content/authors');

export function getAllAuthors(): Author[] {
  try {
    const fileNames = fs.readdirSync(authorsDirectory);
    const authors = fileNames
      .filter(fileName => fileName.endsWith('.json'))
      .map(fileName => {
        const id = fileName.replace(/\.json$/, '');
        return getAuthorById(id);
      })
      .filter(Boolean) as Author[];
    
    return authors;
  } catch (error) {
    return [];
  }
}

export function getAuthorById(id: string): Author | null {
  try {
    const fullPath = path.join(authorsDirectory, `${id}.json`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const author = JSON.parse(fileContents);
    
    return {
      id,
      ...author
    };
  } catch (error) {
    return null;
  }
}
