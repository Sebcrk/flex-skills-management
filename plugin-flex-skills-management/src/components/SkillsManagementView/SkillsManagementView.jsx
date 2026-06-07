import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Theme } from '@twilio-paste/core/theme';
import { Box, Heading } from '@twilio-paste/core';
import { useWorkers } from '../../hooks/useWorkers';
import WorkerList from '../WorkerList/WorkerList';
import SkillsEditor from '../SkillsEditor/SkillsEditor';
import AuditLog from '../AuditLog/AuditLog';

const SkillsManagementView = ({ manager }) => {
  const getToken = useCallback(() => {
    return manager.user.token || '';
  }, [manager]);

  const { workers, loading, error, refetch } = useWorkers(getToken);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const selectedSidsRef = useRef(new Set());

  useEffect(() => {
    selectedSidsRef.current = new Set(selectedWorkers.map((w) => w.sid));
  }, [selectedWorkers]);

  useEffect(() => {
    if (selectedSidsRef.current.size === 0) return;
    const refreshed = workers.filter((w) => selectedSidsRef.current.has(w.sid));
    setSelectedWorkers(refreshed);
  }, [workers]);

  return (
    <Theme.Provider theme="default">
      <Box
        display="flex"
        flexDirection="column"
        padding="space60"
        width="100%"
        height="100%"
        overflow="hidden"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Box marginBottom="space40" flexShrink="0">
          <Heading as="h1" variant="heading10" marginBottom="space0">
            Skills Management
          </Heading>
        </Box>

        <Box display="flex" columnGap="space40" flex="1" minHeight="0">
          <Box
            flex="2"
            borderWidth="borderWidth10"
            borderStyle="solid"
            borderColor="colorBorderWeaker"
            borderRadius="borderRadius30"
            padding="space40"
            overflow="auto"
            minHeight="0"
          >
            <WorkerList
              workers={workers}
              loading={loading}
              error={error}
              selectedWorkers={selectedWorkers}
              onSelectionChange={setSelectedWorkers}
              onRetry={refetch}
            />
          </Box>

          <Box
            flex="3"
            borderWidth="borderWidth10"
            borderStyle="solid"
            borderColor="colorBorderWeaker"
            borderRadius="borderRadius30"
            padding="space40"
            overflow="auto"
            minHeight="0"
          >
            <SkillsEditor
              selectedWorkers={selectedWorkers}
              getToken={getToken}
              onUpdate={refetch}
            />
          </Box>
        </Box>

        <Box
          marginTop="space40"
          borderWidth="borderWidth10"
          borderStyle="solid"
          borderColor="colorBorderWeaker"
          borderRadius="borderRadius30"
          padding="space40"
          flexShrink="0"
          minHeight="120px"
          maxHeight="200px"
          overflow="auto"
        >
          <AuditLog />
        </Box>
      </Box>
    </Theme.Provider>
  );
};

export default SkillsManagementView;
