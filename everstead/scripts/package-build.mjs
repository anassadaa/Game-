#!/usr/bin/env node
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const hosting=fileURLToPath(new URL('../.openai/hosting.json',import.meta.url));
if(!existsSync(hosting)){
 console.log('Prepared standalone web client: dist/client');
 process.exit(0);
}

const prepare=fileURLToPath(new URL('./prepare-sites-build.mjs',import.meta.url));
const result=spawnSync(process.execPath,[prepare],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
