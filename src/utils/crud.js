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

export function getManySortLimit(model) {
  return async function get(criteria, sort, limit) {
    var docs = await model
      .find(criteria)
      .sort(sort)
      .limit(limit)
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

export function updateMany(model) {
  return async function update(criteria, details) {
    var updatedDocs = await model
      .updateMany(criteria, details, { new: true })
      .lean()
      .exec();

    if (!updatedDocs) {
      throw new Error('Noting Updated');
    }

    return updatedDocs;
  }
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
  return async function(details) {
    var removedDocs = await model.deleteMany(details);

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
  updateMany: updateMany(model),
  getMany: getMany(model),
  getManySortLimit: getManySortLimit(model),
  getOne: getOne(model),
  createOne: createOne(model)
});
