import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  Checkbox,
  Spinner,
  Stack,
  Flex as PasteFlex,
} from '@twilio-paste/core';
import { SearchIcon } from '@twilio-paste/icons/esm/SearchIcon';

const getActivityDotColor = (activityName) => {
  const lower = activityName.toLowerCase();
  if (lower === 'available') return '#14b053';
  if (lower === 'busy' || lower === 'reserved') return '#e8a400';
  return '#aeb2c1';
};

const WorkerList = ({ workers, loading, error, selectedWorkers, onSelectionChange, onRetry }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workers;
    const term = searchTerm.toLowerCase();
    return workers.filter(
      (worker) =>
        worker.friendlyName.toLowerCase().includes(term) ||
        worker.skills.some((skill) => skill.toLowerCase().includes(term))
    );
  }, [workers, searchTerm]);

  const selectedSids = useMemo(
    () => new Set(selectedWorkers.map((w) => w.sid)),
    [selectedWorkers]
  );

  const handleToggleWorker = (worker) => {
    if (selectedSids.has(worker.sid)) {
      onSelectionChange(selectedWorkers.filter((w) => w.sid !== worker.sid));
    } else {
      onSelectionChange([...selectedWorkers, worker]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredWorkers);
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Stack orientation="vertical" spacing="space40">
          <Spinner decorative={false} title="Loading workers" size="sizeIcon80" />
          <Text as="p" textAlign="center" color="colorTextWeak">
            Loading workers...
          </Text>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="space40">
        <Text as="p" color="colorTextError">
          Error: {error}
        </Text>
        {onRetry && (
          <Box marginTop="space30">
            <Button variant="primary" size="small" onClick={onRetry}>
              Retry
            </Button>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box marginBottom="space40">
        <Input
          type="text"
          placeholder="Search by name or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          insertBefore={<SearchIcon decorative size="sizeIcon20" />}
        />
      </Box>

      <PasteFlex hAlignContent="between" marginBottom="space30">
        <Text as="span" fontSize="fontSize20" color="colorTextWeak">
          {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''}
        </Text>
        <Box>
          <Button variant="link" size="reset" onClick={handleSelectAll}>
            Select All
          </Button>
          <Text as="span" color="colorTextWeak"> | </Text>
          <Button variant="link" size="reset" onClick={handleClear}>
            Clear
          </Button>
        </Box>
      </PasteFlex>

      <Stack orientation="vertical" spacing="space20">
        {filteredWorkers.map((worker) => (
          <Box
            key={worker.sid}
            display="flex"
            alignItems="center"
            padding="space20"
            borderRadius="borderRadius20"
          >
            <Checkbox
              checked={selectedSids.has(worker.sid)}
              onChange={() => handleToggleWorker(worker)}
              id={`worker-${worker.sid}`}
            >
              <Box display="flex" alignItems="center" columnGap="space20">
                <Box
                  as="span"
                  width="10px"
                  height="10px"
                  borderRadius="borderRadiusCircle"
                  display="inline-block"
                  style={{ backgroundColor: getActivityDotColor(worker.activityName) }}
                />
                <Text as="span" fontSize="fontSize30">
                  {worker.friendlyName}
                </Text>
                <Text as="span" fontSize="fontSize20" color="colorTextWeak">
                  ({worker.activityName})
                </Text>
              </Box>
            </Checkbox>
          </Box>
        ))}

        {filteredWorkers.length === 0 && (
          <Box padding="space40" textAlign="center">
            <Text as="p" color="colorTextWeak">
              No workers match your search.
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default WorkerList;
