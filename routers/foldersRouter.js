const path = require('path');
const express = require('express');
const xss = require('xss');
const foldersService = require('../service/foldersService');

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
  folder_name: xss(folder.folder_name),
});

foldersRouter
  .route('/api/folders')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    foldersService.getAllFolders(knexInstance)
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = folder_name;

    if (newFolder == null) {
      return res.status(400).json({
        error: { message: 'Missing folder_name in request body' }
      });
    }

    foldersService.insertFolder(
      req.app.get('db'),
      newFolder
    )
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route('/api/folders/:folder_id')
  .all((req, res, next) => {
    foldersService.getById(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: 'folder doesn\'t exist' }
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    foldersService.deleteFolder(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { id, folder_name } = req.body;
    const folderToUpdate = { id, folder_name };

    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length;
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: 'Request body must contain either \'id\', \'folder_name\''
        }
      });

    foldersService.updateFolder(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;