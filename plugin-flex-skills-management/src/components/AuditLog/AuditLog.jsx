import React from 'react';
import {
  Box,
  Text,
  Heading,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  Badge,
} from '@twilio-paste/core';
import { useAuditLog } from '../../context/AuditLogContext';

const formatTimestamp = (iso) => {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatWorkers = (workers) => {
  if (workers.length <= 3) {
    return workers.map((w) => w.name).join(', ');
  }
  return `${workers.slice(0, 3).map((w) => w.name).join(', ')} +${workers.length - 3} more`;
};

const AuditLog = () => {
  const { entries } = useAuditLog();

  return (
    <Box>
      <Box marginBottom="space30">
        <Heading as="h3" variant="heading30" marginBottom="space0">
          Audit Log
        </Heading>
      </Box>

      {entries.length === 0 ? (
        <Text as="p" color="colorTextWeak" fontSize="fontSize20">
          No changes recorded this session. Skill modifications will appear here.
        </Text>
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Timestamp</Th>
              <Th>Supervisor</Th>
              <Th>Worker(s)</Th>
              <Th>Action</Th>
              <Th>Skill</Th>
              <Th>Result</Th>
            </Tr>
          </THead>
          <TBody>
            {entries.map((entry) => (
              <Tr key={entry.id}>
                <Td>
                  <Text as="span" fontSize="fontSize20" fontFamily="fontFamilyCode">
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                </Td>
                <Td>
                  <Text as="span" fontSize="fontSize20">
                    {entry.supervisor}
                  </Text>
                </Td>
                <Td>
                  <Text as="span" fontSize="fontSize20">
                    {formatWorkers(entry.workers)}
                  </Text>
                </Td>
                <Td>
                  <Badge
                    as="span"
                    variant={entry.action === 'add' ? 'success' : 'warning'}
                  >
                    {entry.action === 'add' ? 'Added' : 'Removed'}
                  </Badge>
                </Td>
                <Td>
                  <Badge as="span" variant="neutral">
                    {entry.skill}
                  </Badge>
                </Td>
                <Td>
                  <Text as="span" fontSize="fontSize20">
                    {entry.result.updated} updated
                    {entry.result.skipped > 0 && `, ${entry.result.skipped} skipped`}
                    {entry.result.failed > 0 && `, ${entry.result.failed} failed`}
                  </Text>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Box>
  );
};

export default AuditLog;
