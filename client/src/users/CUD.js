'use strict';

import React, {Component} from 'react';
import PropTypes
    from 'prop-types';
import {withTranslation} from '../lib/i18n';
import {
    NavButton,
    requiresAuthenticatedUser,
    Title,
    withPageHelpers
} from '../lib/page';
import {
    Button,
    ButtonRow,
    Form,
    FormSendMethod,
    InputField,
    TableSelect,
    withForm
} from '../lib/form';
import {withErrorHandling} from '../lib/error-handling';
import interoperableErrors
    from '../../../shared/interoperable-errors';
import passwordValidator
    from '../../../shared/password-validator';
import mailtrainConfig
    from 'mailtrainConfig';
import {
    NamespaceSelect,
    validateNamespace
} from '../lib/namespace';
import {DeleteModalDialog} from "../lib/modals";
import {withComponentMixins} from "../lib/decorator-helpers";

@withComponentMixins([
    withTranslation,
    withForm,
    withErrorHandling,
    withPageHelpers,
    requiresAuthenticatedUser
])
export default class CUD extends Component {
    constructor(props) {
        super(props);

        this.passwordValidator = passwordValidator(props.t);

        this.state = {};

        this.initForm({
            serverValidation: {
                url: 'rest/users-validate',
                changed: mailtrainConfig.isAuthMethodLocal ? ['username', 'email'] : ['username'],
                extra: ['id']
            }
        });
    }

    static propTypes = {
        action: PropTypes.string.isRequired,
        entity: PropTypes.object
    }

    componentDidMount() {
        if (this.props.entity) {
            this.getFormValuesFromEntity(this.props.entity, data => {
                data.password = '';
                data.password2 = '';
            });
        } else {
            this.populateFormValues({
                username: '',
                name: '',
                email: '',
                password: '',
                password2: '',
                namespace: mailtrainConfig.user.namespace
            });
        }
    }

    localValidateFormValues(state) {
        const t = this.props.t;
        const isEdit = !!this.props.entity;

        const username = state.getIn(['username', 'value']);
        const usernameServerValidation = state.getIn(['username', 'serverValidation']);

        if (!username) {
            state.setIn(['username', 'error'], t('userNameMustNotBeEmpty'));
        } else if (usernameServerValidation && usernameServerValidation.exists) {
            state.setIn(['username', 'error'], t('theUserNameAlreadyExistsInTheSystem'));
        } else if (!usernameServerValidation) {
            state.setIn(['email', 'error'], t('validationIsInProgress'));
        } else {
            state.setIn(['username', 'error'], null);
        }

        if (!state.getIn(['role', 'value'])) {
            state.setIn(['role', 'error'], t('roleMustBeSelected'));
        } else {
            state.setIn(['role', 'error'], null);
        }


        if (mailtrainConfig.isAuthMethodLocal) {
            const email = state.getIn(['email', 'value']);
            const emailServerValidation = state.getIn(['email', 'serverValidation']);

            if (!email) {
                state.setIn(['email', 'error'], t('emailMustNotBeEmpty-1'));
            } else if (emailServerValidation && emailServerValidation.invalid) {
                state.setIn(['email', 'error'], t('invalidEmailAddress'));
            } else if (emailServerValidation && emailServerValidation.exists) {
                state.setIn(['email', 'error'], t('theEmailIsAlreadyAssociatedWithAnother'));
            } else if (!emailServerValidation) {
                state.setIn(['email', 'error'], t('validationIsInProgress'));
            } else {
                state.setIn(['email', 'error'], null);
            }


            const name = state.getIn(['name', 'value']);

            if (!name) {
                state.setIn(['name', 'error'], t('fullNameMustNotBeEmpty'));
            } else {
                state.setIn(['name', 'error'], null);
            }


            const password = state.getIn(['password', 'value']) || '';
            const password2 = state.getIn(['password2', 'value']) || '';

            const passwordResults = this.passwordValidator.test(password);

            let passwordMsgs = [];

            if (!isEdit && !password) {
                passwordMsgs.push(t('passwordMustNotBeEmpty'));
            }

            if (password) {
                passwordMsgs.push(...passwordResults.errors);
            }

            if (passwordMsgs.length > 1) {
                passwordMsgs = passwordMsgs.map((msg, idx) => <div key={idx}>{msg}</div>)
            }

            state.setIn(['password', 'error'], passwordMsgs.length > 0 ? passwordMsgs : null);
            state.setIn(['password2', 'error'], password !== password2 ? t('passwordsMustMatch') : null);
        }

        validateNamespace(t, state);
    }

    async submitHandler() {
        const t = this.props.t;

        let sendMethod, url;
        if (this.props.entity) {
            sendMethod = FormSendMethod.PUT;
            url = `rest/users/${this.props.entity.id}`
        } else {
            sendMethod = FormSendMethod.POST;
            url = 'rest/users'
        }

        try {
            this.disableForm();
            this.setFormStatusMessage('info', t('saving'));

            const submitSuccessful = await this.validateAndSendFormValuesToURL(sendMethod, url, data => {
                delete data.password2;
            });

            if (submitSuccessful) {
                this.navigateToWithFlashMessage('/users', 'success', t('userSaved'));
            } else {
                this.enableForm();
                this.setFormStatusMessage('warning', t('thereAreErrorsInTheFormPleaseFixThemAnd'));
            }
        } catch (error) {
            if (error instanceof interoperableErrors.DuplicitNameError) {
                this.setFormStatusMessage('danger',
                    <span>
                        <strong>{t('yourUpdatesCannotBeSaved')}</strong>{' '}
                        {t('theUsernameIsAlreadyAssignedToAnother')}
                    </span>
                );
                return;
            }

            if (error instanceof interoperableErrors.DuplicitEmailError) {
                this.setFormStatusMessage('danger',
                    <span>
                        <strong>{t('yourUpdatesCannotBeSaved')}</strong>{' '}
                        {t('theEmailIsAlreadyAssignedToAnotherUser-1')}
                    </span>
                );
                return;
            }

            throw error;
        }
    }

    render() {
        const t = this.props.t;
        const isEdit = !!this.props.entity;
        const userId = this.getFormValue('id');
        const canDelete = isEdit && userId !== 1 && mailtrainConfig.user.id !== userId;

        const rolesColumns = [
            { data: 1, title: "Name" },
            { data: 2, title: "Description" },
        ];


        return (
            <div>
                {canDelete &&
                    <DeleteModalDialog
                        stateOwner={this}
                        visible={this.props.action === 'delete'}
                        deleteUrl={`rest/users/${this.props.entity.id}`}
                        backUrl={`/users/${this.props.entity.id}/edit`}
                        successUrl="/users"
                        deletingMsg={t('deletingUser')}
                        deletedMsg={t('userDeleted')}/>
                }

                <Title>{isEdit ? t('editUser') : t('createUser')}</Title>

                <Form stateOwner={this} onSubmitAsync={::this.submitHandler}>
                    <InputField id="username" label={t('userName')}/>
                    {mailtrainConfig.isAuthMethodLocal &&
                        <div>
                            <InputField id="name" label={t('fullName')}/>
                            <InputField id="email" label={t('email')}/>
                            <InputField id="password" label={t('password')} type="password"/>
                            <InputField id="password2" label={t('repeatPassword')} type="password"/>
                        </div>
                    }
                    <TableSelect id="role" label={t('role')} withHeader dropdown dataUrl={'rest/shares-roles-table/global'} columns={rolesColumns} selectionLabelIndex={1}/>
                    <NamespaceSelect/>

                    <ButtonRow>
                        <Button type="submit" className="btn-primary" icon="ok" label={t('save')}/>
                        {canDelete && <NavButton className="btn-danger" icon="remove" label={t('deleteUser')} linkTo={`/users/${this.props.entity.id}/delete`}/>}
                    </ButtonRow>
                </Form>
            </div>
        );
    }
}
