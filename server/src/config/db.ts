import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('[Database] Error: MONGODB_URI is not defined in environment variables.');
}

export const connectDB = async (): Promise<void> => {
  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Database] MongoDB Connected Successfully!');
  } catch (error) {
    console.error('[Database] Connection Error:', error);
    throw error;
  }
};
