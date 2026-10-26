import * as interestService from '../services/interest.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;
  response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const getMyInterests = async (request, response) => {
  try {
    const interests = await interestService.getMyInterests(request.user.id);
    response.status(200).json(interests);
  } catch (error) {
    sendError(response, error);
  }
};

const addInterest = async (request, response) => {
  try {
    const interest = await interestService.addInterest(
      request.user.id,
      request.params.eventId,
    );
    response.status(200).json(interest);
  } catch (error) {
    sendError(response, error);
  }
};

const deleteInterest = async (request, response) => {
  try {
    await interestService.deleteInterest(
      request.user.id,
      request.params.eventId,
    );
    response.status(204).send();
  } catch (error) {
    sendError(response, error);
  }
};

export { addInterest, deleteInterest, getMyInterests };
