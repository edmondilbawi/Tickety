const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];
const MAXIMUM_REJECTION_REASON_LENGTH = 500;

const validateApprovalStatus = (value) => {
  if (!APPROVAL_STATUSES.includes(value)) {
    return [`Approval status must be one of: ${APPROVAL_STATUSES.join(', ')}`];
  }

  return [];
};

const validateRejectionReason = (reason) => {
  const errors = [];

  if (!reason) {
    errors.push('Rejection reason is required');
  } else if (reason.length > MAXIMUM_REJECTION_REASON_LENGTH) {
    errors.push(
      `Rejection reason must be ${MAXIMUM_REJECTION_REASON_LENGTH} characters or fewer`,
    );
  }

  return errors;
};

export { validateApprovalStatus, validateRejectionReason };
