/*********************************************************************
* Copyright (c) Intel Corporation 2019
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import React from 'react'
import ReactDOM from 'react-dom'
import { RemoteDesktop } from './UI'
import i18n from '../../../../i18n'
// Get browser language
i18n.changeLanguage(navigator.language).catch(() => console.info('error occured'))

const url = new URL(window.location.href)
const params = new URLSearchParams(url.search)

ReactDOM.render(<RemoteDesktop autoConnect={false} deviceId={params.get('deviceId')} mpsServer={params.get('mpsServer') + '/relay'} mouseDebounceTime={200} canvasHeight={'100%'} canvasWidth={'100%'} />, document.querySelector('#kvm'))
