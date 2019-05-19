function getOne(model) {
  return async function get(name) {
    var doc = await model
      .findOne({ name })
      .lean()
      .exec();

    if (!doc) {
      throw new Error('Nothing found');
    }

    return doc;
  };
}

function getMany(model) {
  return async function get(target) {
    var docs = await model
      .find(target)
      .lean()
      .exec();

    if (!docs) {
      throw new Error('Nothing found');
    }

    return docs;
  };
}

function createOne(model) {
  return async function create(details) {
    try {
      var doc = await model.create(details);
    } catch (err) {
      throw new Error(err);
    }
  };
}

function updateOne(model) {
  return async function update(id, details) {
    var updatedDoc = await model
      .findByIdAndUpdate({ id }, details, { new: true })
      .lean()
      .exec();

    if (!updatedDoc) {
      throw new Error('Nothing Updated');
    }

    return updatedDoc;
  };
}

function removeOne(model) {
  return async function(id) {
    var removedDoc = await model.findByIdAndDelete(id);
    
    if (!removedDoc) {
      throw new Error('Nothing removed');
    }

    return removedDoc;
  };
}

export const crudControllers = model => ({
  removeOne: removeOne(model),
  updateOne: updateOne(model),
  getMany: getMany(model),
  getOne: getOne(model),
  createOne: createOne(model)
});
