import mongoose from 'mongoose';

// export var connect = url => mongoose.connect(url);

async function connect(url) {
  try {
    await mongoose.connect(url, { useNewUrlParser: true });
    console.log(`Successfully connected to ${url}`);
  } catch(err) {
    console.log(`Could not connect to ${url}. Exiting.`);
    return;
  }
}

export default connect;