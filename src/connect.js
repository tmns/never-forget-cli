import mongoose from 'mongoose';

// export var connect = url => mongoose.connect(url);

async function connect(url) {
  try {
    await mongoose.connect(url, { useNewUrlParser: true });
  } catch(err) {
    throw new Error('Could not connect to database');
  }
}

export default connect;