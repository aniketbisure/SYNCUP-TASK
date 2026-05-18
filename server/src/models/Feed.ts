import { Schema, model, Document } from 'mongoose';

export interface IFeed extends Document {
  title: string;
  content: string;
  category: string;
  coachName: string;
  createdAt: Date;
}

const FeedSchema = new Schema<IFeed>({
  title: {
    type: String,
    required: [true, 'Feed title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Feed content is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Feed category is required'],
    trim: true,
    index: true,
  },
  coachName: {
    type: String,
    required: [true, 'Coach name is required'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  }
});

// Create mongoose model
export const Feed = model<IFeed>('Feed', FeedSchema);
