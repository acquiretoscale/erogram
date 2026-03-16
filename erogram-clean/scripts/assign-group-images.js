const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const folderIndex = args.indexOf('--folder');
if (folderIndex === -1 || !args[folderIndex + 1]) {
  console.error('❌ Error: Please provide a folder path using --folder argument');
  console.error('Usage: node scripts/assign-group-images.js --folder /path/to/images');
  process.exit(1);
}
const imagesFolder = args[folderIndex + 1];

// MongoDB connection (hardcoded)
const MONGODB_URI = 'mongodb://admin:M4nS1kka@127.0.0.1:27017/erogram?authSource=admin';

// Group Schema (simplified for this script)
const groupSchema = new mongoose.Schema({
  name: String,
  slug: String,
  category: String,
  country: String,
  telegramLink: String,
  description: String,
  image: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  status: String,
  pinned: Boolean,
  views: Number,
  isAdvertisement: Boolean,
  advertisementUrl: String,
  clickCount: Number,
  lastClickedAt: Date,
}, { timestamps: true });

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

// Helper function to convert image to base64
async function imageToBase64(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`❌ Error reading image ${filePath}:`, error.message);
    return null;
  }
}

// Get all image files from folder
async function getImageFiles(folderPath) {
  try {
    const files = await fs.readdir(folderPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => path.join(folderPath, file));
    
    return imageFiles;
  } catch (error) {
    console.error(`❌ Error reading folder ${folderPath}:`, error.message);
    throw error;
  }
}

// Shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function assignImagesToGroups() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if folder exists
    try {
      await fs.access(imagesFolder);
    } catch {
      console.error(`❌ Error: Folder does not exist: ${imagesFolder}`);
      process.exit(1);
    }

    // Get all image files
    console.log(`📁 Reading images from: ${imagesFolder}`);
    const imageFiles = await getImageFiles(imagesFolder);
    
    if (imageFiles.length === 0) {
      console.error(`❌ Error: No image files found in ${imagesFolder}`);
      console.error('   Supported formats: .jpg, .jpeg, .png, .gif, .webp');
      process.exit(1);
    }
    
    console.log(`✅ Found ${imageFiles.length} image files`);

    // Get all groups
    console.log('📋 Fetching all groups from database...');
    const groups = await Group.find({});
    
    if (groups.length === 0) {
      console.log('⚠️  No groups found in database');
      process.exit(0);
    }
    
    console.log(`✅ Found ${groups.length} groups`);

    // Convert images to base64
    console.log('🖼️  Converting images to base64...');
    const base64Images = [];
    for (const imageFile of imageFiles) {
      const base64 = await imageToBase64(imageFile);
      if (base64) {
        base64Images.push(base64);
      }
    }
    
    if (base64Images.length === 0) {
      console.error('❌ Error: No valid images could be converted to base64');
      process.exit(1);
    }
    
    console.log(`✅ Converted ${base64Images.length} images to base64`);

    // Shuffle images for random assignment
    const shuffledImages = shuffleArray(base64Images);

    // Assign images to groups (cycle through images if there are more groups than images)
    console.log('🔄 Assigning images to groups...');
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const imageIndex = i % shuffledImages.length;
      const image = shuffledImages[imageIndex];
      
      try {
        await Group.findByIdAndUpdate(group._id, {
          image: image,
          updatedAt: new Date()
        });
        updated++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${groups.length} groups updated...`);
        }
      } catch (error) {
        console.error(`❌ Error updating group ${group.name} (${group._id}):`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Assignment complete!');
    console.log(`   Updated: ${updated} groups`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} groups`);
    }
    console.log(`   Images used: ${Math.min(shuffledImages.length, groups.length)} unique images`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
assignImagesToGroups()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

