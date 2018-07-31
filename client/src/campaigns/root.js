'use strict';

import React from 'react';

import CampaignsCUD from './CUD';
import CampaignsList from './List';
import Share from '../shares/Share';
import Files from "../lib/files";
import {CampaignSource, CampaignType} from "../../../shared/campaigns";


function getMenus(t) {
    return {
        'campaigns': {
            title: t('Campaigns'),
            link: '/campaigns',
            panelComponent: CampaignsList,
            children: {
                ':campaignId([0-9]+)': {
                    title: resolved => t('Campaign "{{name}}"', {name: resolved.campaign.name}),
                    resolve: {
                        campaign: params => `rest/campaigns/${params.campaignId}`
                    },
                    link: params => `/campaigns/${params.campaignId}/edit`,
                    navs: {
                        ':action(edit|delete)': {
                            title: t('Edit'),
                            link: params => `/campaigns/${params.campaignId}/edit`,
                            visible: resolved => resolved.campaign.permissions.includes('edit'),
                            panelRender: props => <CampaignsCUD action={props.match.params.action} entity={props.resolved.campaign} />
                        },
                        files: {
                            title: t('Files'),
                            link: params => `/campaigns/${params.campaignId}/files`,
                            visible: resolved => resolved.campaign.permissions.includes('edit') && (resolved.campaign.source === CampaignSource.CUSTOM || resolved.campaign.source === CampaignSource.CUSTOM_FROM_TEMPLATE),
                            panelRender: props => <Files title={t('Files')} entity={props.resolved.campaign} entityTypeId="campaign" />
                        },
                        // FIXME: add attachments
                        share: {
                            title: t('Share'),
                            link: params => `/campaigns/${params.campaignId}/share`,
                            visible: resolved => resolved.campaign.permissions.includes('share'),
                            panelRender: props => <Share title={t('Share')} entity={props.resolved.campaign} entityTypeId="campaign" />
                        }
                    }
                },
                'create-regular': {
                    title: t('Create Regular Campaign'),
                    panelRender: props => <CampaignsCUD action="create" type={CampaignType.REGULAR} />
                },
                'create-rss': {
                    title: t('Create RSS Campaign'),
                    panelRender: props => <CampaignsCUD action="create" type={CampaignType.RSS} />
                },
                'create-triggered': {
                    title: t('Create Triggered Campaign'),
                    panelRender: props => <CampaignsCUD action="create" type={CampaignType.TRIGGERED} />
                }
            }
        }
    };
}

export default {
    getMenus
}
