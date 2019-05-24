export function getOne(model) {
  return async function get(criteria) {
    var doc = await model
      .findOne(criteria)
      .lean()
      .exec();

    if (!doc) {
      throw new Error('Nothing found');
    }

    return doc;
  };
}

export function getMany(model) {
  return async function get(criteria) {
    var docs = await model
      .find(criteria)
      .lean()
      .exec();

    if (!docs) {
      throw new Error('Nothing found');
    }

    return docs;
  };
}

export function createOne(model) {
  return async function create(details) {
    try {
      var doc = await model.create(details);
    } catch (err) {
      throw new Error(err);
    }

    return doc;
  };
}

export function updateOne(model) {
  return async function update(id, details) {
    var updatedDoc = await model
      .findByIdAndUpdate(id, details, { new: true })
      .lean()
      .exec();

    if (!updatedDoc) {
      throw new Error('Nothing Updated');
    }

    return updatedDoc;
  };
}

export function removeOne(model) {
  return async function(id) {
    var removedDoc = await model.findByIdAndDelete(id);
    
    if (!removedDoc) {
      throw new Error('Nothing deleted');
    }

    return removedDoc;
  };
}

export function removeMany(model) {
  return async function(criteria) {
    var removedDocs = await model.deleteMany(criteria);

    if (!removedDocs) {
      throw new Error('Nothing deleted');
    }

    return removedDocs;
  }
}

export const crudControllers = model => ({
  removeMany: removeMany(model),
  removeOne: removeOne(model),
  updateOne: updateOne(model),
  getMany: getMany(model),
  getOne: getOne(model),
  createOne: createOne(model)
});
