import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prototypesDir = path.resolve(__dirname, '../prototypes');
const outputFile = path.resolve(prototypesDir, 'index.json');

const TITLE_REGEX = /<title>([\s\S]*?)<\/title>/i;
const META_DESCRIPTION_REGEX = /<meta\s+[^>]*name=["']prototype:description["'][^>]*>/i;
const CONTENT_REGEX = /content\s*=\s*["']([^"']*)["']/i;

async function readPrototypeMetadata(slug) {
    const indexPath = path.join(prototypesDir, slug, 'index.html');
    try {
        const html = await fs.readFile(indexPath, 'utf8');
        const titleMatch = html.match(TITLE_REGEX);
        const metaMatch = html.match(META_DESCRIPTION_REGEX);
        let description = '';

        if (metaMatch) {
            const contentMatch = metaMatch[0].match(CONTENT_REGEX);
            if (contentMatch) {
                description = contentMatch[1].trim();
            }
        }

        return {
            slug,
            title: titleMatch ? titleMatch[1].trim() : slug,
            description,
        };
    } catch (error) {
        console.warn(`Skipping metadata for ${slug}:`, error.message);
        return {
            slug,
            title: slug,
            description: '',
        };
    }
}

async function generatePrototypeIndex() {
    try {
        const dirEntries = await fs.readdir(prototypesDir, { withFileTypes: true });
        const prototypeSlugs = dirEntries
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();

        const prototypeMetadata = await Promise.all(
            prototypeSlugs.map((slug) => readPrototypeMetadata(slug))
        );

        await fs.writeFile(
            outputFile,
            `${JSON.stringify(prototypeMetadata, null, 2)}\n`,
            'utf8',
        );
        console.log(`Prototype index written to ${outputFile}`);
    } catch (error) {
        console.error('Failed to generate prototype index:', error);
        process.exitCode = 1;
    }
}

generatePrototypeIndex();
