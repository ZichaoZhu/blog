import {defineConfig} from '@playwright/test';
const isolated=process.env.PAPER_TREE_TEST_DIR;
const selected=process.argv.find(arg=>arg.startsWith('--project='))?.split('=')[1];
export default defineConfig({
 testDir:'./tests/e2e',timeout:45000,workers:1,fullyParallel:false,reporter:'list',outputDir:'test-results/paper-trees',
 webServer:[
  ...(!selected||selected==='canvas'?[{command:'pnpm exec astro dev --root tests/fixtures/paper-tree-app --host 127.0.0.1 --port 4322',env:{ASTRO_DEV_BACKGROUND:'1'},url:'http://127.0.0.1:4322',reuseExistingServer:!process.env.CI}]:[]),
  ...(!selected||selected==='studio'||selected==='publish'?[{command:'pnpm dev:studio',env:{ASTRO_DEV_BACKGROUND:'1'},url:'http://127.0.0.1:4323',reuseExistingServer:false}]:[]),
  ...(isolated&&(!selected||selected==='public')?[{command:'pnpm exec astro preview --root "$PAPER_TREE_TEST_DIR" --host 127.0.0.1 --port 4324',env:{ASTRO_PREVIEW_BACKGROUND:'1'},url:'http://127.0.0.1:4324',reuseExistingServer:false}]:[]),
 ],
 projects:[
  {name:'canvas',testMatch:'paper-tree-canvas.spec.ts',use:{baseURL:'http://127.0.0.1:4322',viewport:{width:1440,height:900},trace:'retain-on-failure'}},
  {name:'studio',testMatch:'paper-tree-editor.spec.ts',use:{baseURL:'http://127.0.0.1:4323',viewport:{width:1440,height:900},trace:'retain-on-failure'}},
  {name:'publish',testMatch:'paper-tree-publish.spec.ts',use:{baseURL:'http://127.0.0.1:4323',viewport:{width:1440,height:900},trace:'retain-on-failure'}},
  ...(isolated?[{name:'public',testMatch:'paper-tree-reader.spec.ts',use:{baseURL:'http://127.0.0.1:4324',viewport:{width:1440,height:900},trace:'retain-on-failure' as const}}]:[]),
 ],
});
