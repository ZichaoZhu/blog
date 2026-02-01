import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

interface BlurDataMap {
  [key: string]: string;
}

async function generateBlurPlaceholder(imagePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(imagePath);
    
    const thumbnail = await sharp(buffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(10)
      .toBuffer();
    
    const base64 = thumbnail.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`Error generating blur for ${imagePath}:`, error);
    return '';
  }
}

async function generateAllBlurData() {
  const blurDataMap: BlurDataMap = {};
  
  // 查找所有图片
  const imagePatterns = [
    'public/**/*.{jpg,jpeg,png,webp}',
    'content/**/*.{jpg,jpeg,png,webp}'
  ];
  
  for (const pattern of imagePatterns) {
    const images = await glob(pattern, { cwd: process.cwd() });
    
    for (const imagePath of images) {
      const fullPath = path.join(process.cwd(), imagePath);
      const blurData = await generateBlurPlaceholder(fullPath);
      
      // 生成相对路径作为 key
      const relativePath = imagePath.replace(/^public/, '');
      blurDataMap[relativePath] = blurData;
      
      console.log(`✓ Generated blur data for: ${relativePath}`);
    }
  }
  
  // 保存到 JSON 文件
  const outputPath = path.join(process.cwd(), 'lib', 'blurDataMap.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(blurDataMap, null, 2)
  );
  
  console.log(`\n✓ Generated blur data for ${Object.keys(blurDataMap).length} images`);
  console.log(`✓ Saved to: ${outputPath}`);
}

generateAllBlurData().catch(console.error);
