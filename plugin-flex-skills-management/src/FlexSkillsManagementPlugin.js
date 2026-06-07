import React from 'react';
import { FlexPlugin } from '@twilio/flex-plugin';

import { AuditLogProvider } from './context/AuditLogContext';
import SkillsManagementView from './components/SkillsManagementView/SkillsManagementView';

const PLUGIN_NAME = 'FlexSkillsManagementPlugin';

export default class FlexSkillsManagementPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   */
  async init(flex, manager) {
    const { View, SideLink } = flex;
    const roles = manager.user.roles;
    const isSupervisorOrAdmin = roles.includes('supervisor') || roles.includes('admin');

    if (!isSupervisorOrAdmin) return;

    flex.ViewCollection.Content.add(
      <View name="skills-management" key="skills-management-view">
        <AuditLogProvider>
          <SkillsManagementView manager={manager} />
        </AuditLogProvider>
      </View>
    );

    flex.SideNav.Content.add(
      <SideLink
        key="skills-management-sidenav-button"
        icon="People"
        iconActive="People"
        onClick={() => flex.Actions.invokeAction('NavigateToView', { viewName: 'skills-management' })}
      >
        Skills Management
      </SideLink>,
      { sortOrder: 10 }
    );
  }
}
