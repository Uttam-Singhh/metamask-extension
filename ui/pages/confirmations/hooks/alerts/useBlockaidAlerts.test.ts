import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import { getMockConfirmState } from '../../../../../test/data/confirmations/helper';
import {
  BlockaidResultType,
  SecurityProvider,
} from '../../../../../shared/constants/security-provider';
import { renderHookWithConfirmContextProvider } from '../../../../../test/lib/confirmations/render-helpers';
import { Severity } from '../../../../helpers/constants/design-system';
import mockState from '../../../../../test/data/mock-state.json';
import { SecurityAlertResponse } from '../../types/confirm';
import useBlockaidAlert from './useBlockaidAlerts';

const mockSecurityAlertResponse: SecurityAlertResponse = {
  securityAlertId: 'test-id-mock',
  reason: 'test-reason',
  result_type: BlockaidResultType.Malicious,
  features: ['Feature 1', 'Feature 2'],
};

const currentConfirmationMock = {
  id: '1',
  status: 'unapproved',
  time: new Date().getTime(),
  type: ApprovalType.PersonalSign,
  securityAlertResponse: mockSecurityAlertResponse,
};

const getMockCurrentState = (args: Record<string, unknown>) =>
  getMockConfirmState({
    metamask: {
      unapprovedPersonalMsgs: {
        '1': { ...currentConfirmationMock, msgParams: {} },
      },
      pendingApprovals: {
        '1': {
          ...currentConfirmationMock,
          origin: 'origin',
          requestData: {},
          requestState: null,
          expectsResult: false,
        },
      },
      signatureSecurityAlertResponses: {
        'test-id-mock': mockSecurityAlertResponse,
      },
      ...args,
    },
  });

const EXPECTED_ALERT = {
  key: mockSecurityAlertResponse.securityAlertId,
  severity: Severity.Danger,
  message: 'If you approve this request, you might lose your assets.',
  alertDetails: mockSecurityAlertResponse.features,
  provider: SecurityProvider.Blockaid,
  reason: 'This is a deceptive request',
};

describe('useBlockaidAlerts', () => {
  it('returns an empty array when there is no confirmation', () => {
    const { result } = renderHookWithConfirmContextProvider(
      () => useBlockaidAlert(),
      mockState,
    );
    expect(result.current).toEqual([]);
  });

  it('returns alerts when there is a valid PersonalSign confirmation with a security alert response', () => {
    const mockCurrentState = getMockCurrentState({
      signatureSecurityAlertResponses: {
        'test-id-mock': mockSecurityAlertResponse,
      },
    });
    const { result } = renderHookWithConfirmContextProvider(
      () => useBlockaidAlert(),
      mockCurrentState,
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].reportUrl).toBeDefined();
    delete result.current[0].reportUrl;
    expect(result.current[0]).toStrictEqual(EXPECTED_ALERT);
  });

  it('returns alerts if confirmation is contract interaction with security alert response', () => {
    const mockCurrentState = getMockCurrentState({
      pendingApprovals: {
        '1': {
          id: '1',
          type: ApprovalType.Transaction,
        },
      },
      transactions: [
        {
          id: '1',
          type: TransactionType.contractInteraction,
          chainId: '0x5',
          securityAlertResponse: mockSecurityAlertResponse,
          status: TransactionStatus.unapproved,
        },
      ],
    });

    const { result } = renderHookWithConfirmContextProvider(
      () => useBlockaidAlert(),
      mockCurrentState,
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].reportUrl).toBeDefined();
    delete result.current[0].reportUrl;
    expect(result.current[0]).toStrictEqual(EXPECTED_ALERT);
  });
});
