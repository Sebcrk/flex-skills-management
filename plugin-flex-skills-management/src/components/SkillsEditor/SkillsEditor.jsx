import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  Badge,
  Tooltip,
  Spinner,
  Heading,
  Flex as PasteFlex,
  Toaster,
  useToaster,
  AlertDialog,
} from '@twilio-paste/core';
import { PlusIcon } from '@twilio-paste/icons/esm/PlusIcon';
import { CloseIcon } from '@twilio-paste/icons/esm/CloseIcon';
import { updateSkills } from '../../services/skillsService';
import { useAuditLog } from '../../context/AuditLogContext';

const SkillsEditor = ({ selectedWorkers, getToken, onUpdate }) => {
  const [newSkill, setNewSkill] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmRemoveSkill, setConfirmRemoveSkill] = useState(null);
  const { addEntry } = useAuditLog();
  const toaster = useToaster();

  const skillsInfo = useMemo(() => {
    if (selectedWorkers.length === 0) return [];

    const skillMap = new Map();

    selectedWorkers.forEach((worker) => {
      worker.skills.forEach((skill) => {
        const existing = skillMap.get(skill) || [];
        existing.push(worker.friendlyName);
        skillMap.set(skill, existing);
      });
    });

    return Array.from(skillMap.entries())
      .map(([skill, workerNames]) => ({
        skill,
        count: workerNames.length,
        total: selectedWorkers.length,
        workerNames,
      }))
      .sort((a, b) => a.skill.localeCompare(b.skill));
  }, [selectedWorkers]);

  const handleAddSkill = async () => {
    const skill = newSkill.trim();
    if (!skill || selectedWorkers.length === 0) return;

    setIsUpdating(true);
    try {
      const token = getToken();
      const workerSids = selectedWorkers.map((w) => w.sid);
      const response = await updateSkills(workerSids, 'add', skill, token);

      const { updated, skipped, failed } = response.summary;
      let message = `Added '${skill}' to ${updated} worker${updated !== 1 ? 's' : ''}.`;
      if (skipped > 0) {
        message += ` ${skipped} already had it.`;
      }
      if (failed > 0) {
        message += ` ${failed} failed.`;
      }

      toaster.push({
        message,
        variant: failed > 0 ? 'error' : skipped > 0 ? 'warning' : 'success',
        dismissAfter: 5000,
      });

      addEntry({
        supervisor: response.supervisor,
        workers: selectedWorkers.map((w) => ({ sid: w.sid, name: w.friendlyName })),
        action: 'add',
        skill,
        result: response.summary,
      });

      setNewSkill('');
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add skill';
      toaster.push({
        message,
        variant: 'error',
        dismissAfter: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveSkill = async (skill) => {
    setConfirmRemoveSkill(null);
    setIsUpdating(true);
    try {
      const token = getToken();
      const workerSids = selectedWorkers.map((w) => w.sid);
      const response = await updateSkills(workerSids, 'remove', skill, token);

      const { updated, skipped, failed } = response.summary;
      let message = `Removed '${skill}' from ${updated} worker${updated !== 1 ? 's' : ''}.`;
      if (skipped > 0) {
        message += ` ${skipped} didn't have it.`;
      }
      if (failed > 0) {
        message += ` ${failed} failed.`;
      }

      toaster.push({
        message,
        variant: failed > 0 ? 'error' : skipped > 0 ? 'warning' : 'success',
        dismissAfter: 5000,
      });

      addEntry({
        supervisor: response.supervisor,
        workers: selectedWorkers.map((w) => ({ sid: w.sid, name: w.friendlyName })),
        action: 'remove',
        skill,
        result: response.summary,
      });

      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove skill';
      toaster.push({
        message,
        variant: 'error',
        dismissAfter: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddSkill();
    }
  };

  if (selectedWorkers.length === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Text as="p" color="colorTextWeak" fontSize="fontSize30">
          Select one or more workers to manage their skills.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <Toaster {...toaster} />

      <AlertDialog
        heading="Confirm Skill Removal"
        isOpen={confirmRemoveSkill !== null}
        onConfirm={() => confirmRemoveSkill && handleRemoveSkill(confirmRemoveSkill)}
        onConfirmLabel="Remove"
        onDismiss={() => setConfirmRemoveSkill(null)}
        onDismissLabel="Cancel"
        destructive
      >
        Are you sure you want to remove the skill &quot;{confirmRemoveSkill}&quot; from{' '}
        {selectedWorkers.length} selected worker{selectedWorkers.length !== 1 ? 's' : ''}?
      </AlertDialog>

      <Box marginBottom="space40">
        <Heading as="h3" variant="heading30" marginBottom="space0">
          Selected: {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? 's' : ''}
        </Heading>
      </Box>

      <Box marginBottom="space50">
        <Text as="p" fontWeight="fontWeightSemibold" marginBottom="space30">
          Skills:
        </Text>

        {skillsInfo.length === 0 ? (
          <Text as="p" color="colorTextWeak" fontSize="fontSize20">
            No skills assigned to selected workers.
          </Text>
        ) : (
          <Box display="flex" flexWrap="wrap" rowGap="space20" columnGap="space20">
            {skillsInfo.map(({ skill, count, total, workerNames }) => (
              <Tooltip key={skill} text={workerNames.join(', ')}>
                <Box display="inline-flex" alignItems="center" columnGap="space10">
                  <Badge as="span" variant="neutral">
                    {skill} ({count}/{total})
                  </Badge>
                  <Button
                    variant="destructive_icon"
                    size="reset"
                    onClick={() => setConfirmRemoveSkill(skill)}
                    disabled={isUpdating}
                  >
                    <CloseIcon decorative={false} title={`Remove ${skill}`} size="sizeIcon10" />
                  </Button>
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>

      <Box marginTop="space40">
        <Text as="p" fontWeight="fontWeightSemibold" marginBottom="space30">
          Add Skill:
        </Text>
        <PasteFlex>
          <Box flexGrow={1} marginRight="space20">
            <Input
              type="text"
              placeholder="Enter skill name..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
            />
          </Box>
          <Button
            variant="primary"
            onClick={handleAddSkill}
            disabled={isUpdating || !newSkill.trim()}
          >
            {isUpdating ? (
              <Spinner decorative={false} title="Updating..." size="sizeIcon20" />
            ) : (
              <>
                <PlusIcon decorative size="sizeIcon20" />
                Add
              </>
            )}
          </Button>
        </PasteFlex>
      </Box>

      {isUpdating && (
        <Box marginTop="space40" textAlign="center">
          <Text as="p" color="colorTextWeak" fontSize="fontSize20">
            Updating skills...
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SkillsEditor;
