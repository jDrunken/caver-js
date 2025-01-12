/*
    Copyright 2018 The caver-js Authors
    This file is part of the caver-js library.
 
    The caver-js library is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
 
    The caver-js library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.
 
    You should have received a copy of the GNU Lesser General Public License
    along with the caver-js. If not, see <http://www.gnu.org/licenses/>.
*/

const testRPCURL = require('../testrpc')
const { expect } = require('../extendedChai')

const setting = require('./setting')
const utils = require('./utils')
const Caver = require('../../index.js')
const BN = require('bn.js')

const MessagePrefix = "\x19Klaytn Signed Message:\n"

let caver

beforeEach(() => {
  caver = new Caver(testRPCURL)
})

function isAccount(data, { privateKey, address } = {}) {
  // account object keys
  const keys = [
    'address',
    'privateKey',
    'signTransaction',
    'sign',
    'encrypt',
    'getKlaytnWalletKey'
  ]

  expect(Object.getOwnPropertyNames(data)).to.deep.equal(keys)

  expect(caver.utils.isAddress(data.address)).to.equal(true)

  if (privateKey !== undefined) {
    expect(data.privateKey).to.equal(privateKey)
  }

  if (address !== undefined) {
    expect(data.address).to.equal(address.toLowerCase())
  }
}

function checkHashMessage(hashed, originMessage) {
  const enveloped = MessagePrefix + originMessage.length + originMessage
  const originHashed = caver.utils.sha3(enveloped)
  expect(hashed).to.equal(originHashed)
}

function isKeystoreV3(data, { address }) {
  const keys = ['version', 'id', 'address', 'crypto']
  expect(Object.getOwnPropertyNames(data)).to.deep.equal(keys)

  expect(caver.utils.isAddress(data.address)).to.equal(true)

  prefixTrimmed = data.address.replace(/^(0x)*/i, '')
  expect(prefixTrimmed).to.match(new RegExp(`^${address.slice(2)}$`, 'i'))
}

function isWallet(data, { accounts } = {}) {
  // check if function exists
  const fns = ['add', 'remove', 'clear']
  fns.forEach(fn => {
    expect(fn in data).to.equal(true)
  })

  expect(data.defaultKeyName).to.equal('caverjs_wallet')

  if (accounts && accounts.length > 0) {
    expect(data.length).to.equal(accounts.length)

    for (let i = 0; i < data.length; i++) {
        let accountObj = Object.assign({}, data[i])
        delete accountObj.index

        isAccount(accountObj, { privateKey: accounts[i].privateKey, address: accounts[i].address })

        accountObj = Object.assign({}, data[accountObj.address])
        delete accountObj.index

        isAccount(accountObj, { privateKey: accounts[i].privateKey, address: accounts[i].address })
    }
  }
}

describe('caver.klay.accounts.create', () => {
  context('CAVERJS-UNIT-WALLET-021 : input: no parameter', () => {
    it('should return valid account', () => {
      const result = caver.klay.accounts.create()
      return isAccount(result)
    })
  })

  context('CAVERJS-UNIT-WALLET-022 : input: entropy', () => {
    it('should return valid account', () => {
      const entropy = caver.utils.randomHex(32)

      const result = caver.klay.accounts.create(entropy)
      return isAccount(result)
    })
  })
})

describe('caver.klay.accounts.privateKeyToAccount', () => {
  context('input: valid privatekey', () => {
    it('should return valid account', () => {
      const privateKey = caver.utils.randomHex(32)
      const result = caver.klay.accounts.privateKeyToAccount(privateKey)
      return isAccount(result)
    })
  })

  context('input: invalid privatekey', () => {
    it('should throw an error', () => {
      const invalidPrivateKey = caver.utils.randomHex(31)

      const errorMessage = 'Invalid private key'
      expect(() => caver.klay.accounts.privateKeyToAccount(invalidPrivateKey))
        .to.throw(errorMessage)
    })
  })
})

describe('caver.klay.accounts.signTransaction', () => {
  let txObj, vtTx, account

  beforeEach(() => {
    account = caver.klay.accounts.create()
    caver.klay.accounts.wallet.add(account)

    txObj = {
      from: account.address,
      nonce: '0x0',
      to: setting.toAddress,
      gas: setting.gas,
      gasPrice: setting.gasPrice,
      value: '0x1',
      chainId: 2019,
    }


    vtTx = { 
      type: 'VALUE_TRANSFER',
      from: account.address,
      to: '0xd05c5926b0a2f31aadcc9a9cbd3868a50104d834',
      value: '0x1',
      gas: '0xdbba0',
      chainId: '0x7e3',
      gasPrice: '0x5d21dba00',
      nonce: '0x9a',
    }
  })

  context('CAVERJS-UNIT-WALLET-023 : input: tx, privateKey', () => {
    it('should return signature and rawTransaction', async () => {
      const result = await caver.klay.accounts.signTransaction(
        txObj,
        account.privateKey
      )

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-026 : input: tx, privateKey, without nonce', () => {
    it('should return signature and rawTransaction', async () => {
      const tx = Object.assign({}, txObj)
      delete tx.nonce

      const result = await caver.klay.accounts.signTransaction(tx, account.privateKey)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-027 : input: tx, privateKey, without gasPrice', () => {
    it('should return signature and rawTransaction', async () => {
      const tx = Object.assign({}, txObj)
      delete tx.gasPrice

      const result = await caver.klay.accounts.signTransaction(tx, account.privateKey)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-028 : input: tx, privateKey, without chainId', () => {
    it('should return signature and rawTransaction', async () => {
      const tx = Object.assign({}, txObj)
      delete tx.chainId

      const result = await caver.klay.accounts.signTransaction(tx, account.privateKey)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-024 : input: tx:invalid address, privateKey', () => {
    it('should throw an error', async () => {
      const invalid = Object.assign({}, txObj)
      delete invalid.to
      delete invalid.data

      const errorMessage = 'contract creation without any data provided'

      await expect(caver.klay.accounts.signTransaction(invalid, account.privateKey))
        .to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-024 : input: tx:invalid value, privateKey', async () => {
    it('should throw an error', async () => {
      const invalid = Object.assign({}, txObj)
      invalid.value = '0xzzzz'

      const errorMessage = `Given input "${invalid.value}" is not a number.`

      await expect(caver.klay.accounts.signTransaction(invalid, account.privateKey))
        .to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-025 : input: tx, privateKey:invalid', () => {
    it('should throw an error', async () => {
      const invalidPrivateKey = caver.utils.randomHex(31)    // 31bytes

      const errorMessage = 'Invalid private key'

      await expect(caver.klay.accounts.signTransaction(txObj, invalidPrivateKey)).to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-023 : input: tx, privateKey, callback', () => {
    it('should return signature and rawTransaction', (done) => {
      caver.klay.accounts.signTransaction(
        txObj,
        account.privateKey,
        (error, result) => {
          const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
          expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

          expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
          done()
        })
    })
  })

  context('CAVERJS-UNIT-WALLET-102 : input: tx, privateKey, callback', () => {
    it('should return valid senderTxHash', async () => {
      const feeDelegatedTx = { 
        type: 'FEE_DELEGATED_VALUE_TRANSFER',
        from: '0x76d1cc1cdb081de8627cab2c074f02ebc7bce0d0',
        to: '0xd05c5926b0a2f31aadcc9a9cbd3868a50104d834',
        value: '0x1',
        gas: '0xdbba0',
        chainId: '0x7e3',
        gasPrice: '0x5d21dba00',
        nonce: '0x9a',
      }
      const result = await caver.klay.accounts.signTransaction(feeDelegatedTx, '1881a973628dba6ab07b6b47c8f3fb50d8e7cbf71fef3b4739155619a3c126fa')
      expect(result.senderTxHash).to.equal('0x1b7c0f2fc7548056e90d9690e8c397acf99eb38e622ac91ee22c2085065f8a55')
    })
  })

  context('CAVERJS-UNIT-WALLET-122 : input: legacyTx, privateKey of decoupled account', () => {
    it('should return signature and rawTransaction', async () => {
      const decoupledAccount = caver.klay.accounts.create()
      decoupledAccount.privateKey = caver.klay.accounts.create().privateKey

      let tx = {
        from: decoupledAccount.address,
        nonce: '0x0',
        to: setting.toAddress,
        gas: setting.gas,
        gasPrice: setting.gasPrice,
        value: '0x1',
        chainId: 2019,
      }

      const errorMessage = 'A legacy transaction must be with a legacy account key'

      await expect(caver.klay.accounts.signTransaction(tx, decoupledAccount.privateKey)).to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-123 : input: if there are invalid number of parameters then signTrasnaction should reject', () => {
    it('should reject when there is no parameter', async () => {
      const errorMessage = 'Invalid parameter: The number of parameters is invalid.'
      await expect(caver.klay.accounts.signTransaction()).to.be.rejectedWith(errorMessage)
    })

    it('should reject when there are more than three parameters', async () => {
      const errorMessage = 'Invalid parameter: The number of parameters is invalid.'
      await expect(caver.klay.accounts.signTransaction({}, 'privateKey', ()=>{}, 'one more')).to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-124 : input: if there are valid number of parameters then signTrasnaction should set properly', () => {
    it('should sign to transaction parameter with private key in wallet', async () => {
      const result = await caver.klay.accounts.signTransaction(txObj)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(typeof result.signatures[0]).to.equals('string')

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)
    })

    it('should sign to transaction parameter with private key in wallet with callback', async () => {
      let isCalled = false
      const result = await caver.klay.accounts.signTransaction(txObj, (error, result) => isCalled = true)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(typeof result.signatures[0]).to.equals('string')

      expect(caver.klay.accounts.recoverTransaction(result.rawTransaction)).to.equal(account.address)

      expect(isCalled).to.be.true
    })

    it('should sign to transaction parameter with private key parameter', async () => {
      const result = await caver.klay.accounts.signTransaction(vtTx, account.privateKey)

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(Array.isArray(result.signatures[0])).to.be.true
      expect(result.signatures.length).to.equals(1)
    })

    it('should sign to transaction parameter with private key array', async () => {
      const result = await caver.klay.accounts.signTransaction(vtTx, [account.privateKey.slice(2), account.privateKey])

      const keys = ['messageHash', 'v', 'r', 's', 'rawTransaction', 'txHash', 'senderTxHash', 'signatures']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      expect(Array.isArray(result.signatures[0])).to.be.true
      expect(result.signatures.length).to.equals(2)

      const decoded = caver.klay.decodeTransaction(result.rawTransaction)
      expect(decoded.signatures.length).to.equals(2)
      expect(decoded.signatures[0][0]).to.equals(result.signatures[0][0])
      expect(decoded.signatures[0][1]).to.equals(result.signatures[0][1])
      expect(decoded.signatures[0][2]).to.equals(result.signatures[0][2])
      expect(decoded.signatures[1][0]).to.equals(result.signatures[1][0])
      expect(decoded.signatures[1][1]).to.equals(result.signatures[1][1])
      expect(decoded.signatures[1][2]).to.equals(result.signatures[1][2])
    })
  })

  context('CAVERJS-UNIT-WALLET-130 : input: txObject', () => {
    it('should sign with feePayer and return feePayerSignatures', async () => {
      const feeDelegatedTx = { 
        type: 'FEE_DELEGATED_VALUE_TRANSFER',
        from: '0x76d1cc1cdb081de8627cab2c074f02ebc7bce0d0',
        to: '0xd05c5926b0a2f31aadcc9a9cbd3868a50104d834',
        value: '0x1',
        gas: '0xdbba0',
        chainId: '0x7e3',
        gasPrice: '0x5d21dba00',
        nonce: '0x9a',
      }
      const senderSigned = await caver.klay.accounts.signTransaction(feeDelegatedTx, '1881a973628dba6ab07b6b47c8f3fb50d8e7cbf71fef3b4739155619a3c126fa')
      
      const feePayerTransaction = {
        senderRawTransaction: senderSigned.rawTransaction,
        feePayer: account.address
      }
      const feePayerSigned = await caver.klay.accounts.signTransaction(feePayerTransaction)
      expect(feePayerSigned.feePayerSignatures).not.to.be.undefined
      expect(Array.isArray(feePayerSigned.feePayerSignatures)).to.be.true

      const decoded = caver.klay.decodeTransaction(feePayerSigned.rawTransaction)
      expect(decoded.signatures.length).to.equals(1)
      expect(decoded.signatures[0][0]).to.equals(senderSigned.signatures[0][0])
      expect(decoded.signatures[0][1]).to.equals(senderSigned.signatures[0][1])
      expect(decoded.signatures[0][2]).to.equals(senderSigned.signatures[0][2])
      expect(decoded.feePayerSignatures[0][0]).to.equals(feePayerSigned.feePayerSignatures[0][0])
      expect(decoded.feePayerSignatures[0][1]).to.equals(feePayerSigned.feePayerSignatures[0][1])
      expect(decoded.feePayerSignatures[0][2]).to.equals(feePayerSigned.feePayerSignatures[0][2])
    })
  })

  context('CAVERJS-UNIT-WALLET-131 : input: txObject for fee payer without feePayer field', () => {
    it('should reject', async () => {
      const feeDelegatedTx = { 
        type: 'FEE_DELEGATED_VALUE_TRANSFER',
        from: '0x76d1cc1cdb081de8627cab2c074f02ebc7bce0d0',
        to: '0xd05c5926b0a2f31aadcc9a9cbd3868a50104d834',
        value: '0x1',
        gas: '0xdbba0',
        chainId: '0x7e3',
        gasPrice: '0x5d21dba00',
        nonce: '0x9a',
      }
      const senderSigned = await caver.klay.accounts.signTransaction(feeDelegatedTx, '1881a973628dba6ab07b6b47c8f3fb50d8e7cbf71fef3b4739155619a3c126fa')
      
      const feePayerTransaction = {
        senderRawTransaction: senderSigned.rawTransaction,
      }

      const errorMessage = 'To sign with fee payer, senderRawTransaction and feePayer must be defined in the transaction object.'
      await expect(caver.klay.accounts.signTransaction(feePayerTransaction)).to.be.rejectedWith(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-132 : input: txObject without private key', () => {
    it('when fail to find account, should reject with expected error message', async () => {
      const feeDelegatedTx = { 
        type: 'FEE_DELEGATED_VALUE_TRANSFER',
        from: caver.klay.accounts.create().address,
        to: '0xd05c5926b0a2f31aadcc9a9cbd3868a50104d834',
        value: '0x1',
        gas: '0xdbba0',
        chainId: '0x7e3',
        gasPrice: '0x5d21dba00',
        nonce: '0x9a',
      }
      const errorMessage = 'Failed to find get private key to sign. The account you want to use for signing must exist in caver.klay.accounts.wallet or you must pass the private key as a parameter.'
      await expect(caver.klay.accounts.signTransaction(feeDelegatedTx)).to.be.rejectedWith(errorMessage)
    })
  })
})

describe('caver.klay.accounts.recoverTransaction', () => {
  let account
  let rawTx

  beforeEach(async () => {
    account = caver.klay.accounts.create()

    const txObj = {
      from: account.address,
      nonce: '0x0',
      to: setting.toAddress,
      gas: setting.gas,
      gasPrice: setting.gasPrice,
      value: '0x1'
    }
    const signedTx = await account.signTransaction(txObj)
    rawTx = signedTx.rawTransaction
  })

  context('CAVERJS-UNIT-WALLET-029 : rawTransaction', () => {
    it('should return valid address', () => {
      const result = caver.klay.accounts.recoverTransaction(rawTx)
      expect(result).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-030 : rawTransaction:invalid', () => {
    it('should not equal to account.address', () => {
      const invalid = rawTx.slice(0, -2)
      const result = caver.klay.accounts.recoverTransaction(invalid)
      expect(result).to.not.equal(account.addrss)
    })
  })

  context('CAVERJS-UNIT-WALLET-104 : rawTransaction: leading zeroes of the signature are trimmed', () => {
    it('should equal to account.address', async () => {
      const transaction = {
        from: '0x13b0d8316F0c3cE0C3C51Ebb586A14d7d90112fD',
        nonce: '0x0',
        to: '0x30d8d4217145ba3f6cde24ec28c64c9120f2bdfb',
        gas: 900000,
        gasPrice: 25000000000,
        value: '0x1',
        chainId: 10000,
      }
      account.address = '0x13b0d8316F0c3cE0C3C51Ebb586A14d7d90112fD'
      account.privateKey = '0x72d72a46401220f08ccb1b17b550feb816840f2f8ce86361e7ee54ac7a9ee6d8'

      const signed = await caver.klay.accounts.signTransaction(transaction, account.privateKey)

      const rlpDecoded = caver.utils.rlpDecode(signed.rawTransaction)
      expect(rlpDecoded[7].length).not.to.equals(rlpDecoded[8].length)

      const result = caver.klay.accounts.recoverTransaction(signed.rawTransaction)
      expect(result).to.not.equal(account.addrss)
    })
  })

  context('CAVERJS-UNIT-WALLET-105 : rawTransaction: Non-LEGACY transactions.', () => {
    it('should throw error', async () => {
      const transaction = {
        type: 'VALUE_TRANSFER',
        from: '0x13b0d8316F0c3cE0C3C51Ebb586A14d7d90112fD',
        nonce: '0x0',
        to: '0x30d8d4217145ba3f6cde24ec28c64c9120f2bdfb',
        gas: 900000,
        gasPrice: 25000000000,
        value: '0x1',
        chainId: 10000,
      }
      account.address = '0x13b0d8316F0c3cE0C3C51Ebb586A14d7d90112fD'
      account.privateKey = '0x72d72a46401220f08ccb1b17b550feb816840f2f8ce86361e7ee54ac7a9ee6d8'

      const signed = await caver.klay.accounts.signTransaction(transaction, account.privateKey)

      const errorMessage = 'recoverTransaction only supports transactions of type "LEGACY".'
      expect(()=>caver.klay.accounts.recoverTransaction(signed.rawTransaction)).to.throws(errorMessage)
    })
  })
})

describe('caver.klay.accounts.hashMessage', () => {
  it('CAVERJS-UNIT-WALLET-031, CAVERJS-UNIT-WALLET-032 : result should be same with keccak256(MessagePrefix + originMessage.length + originMessage)', () => {
    const message = 'Hello World'
    let result = caver.klay.accounts.hashMessage(message)
    checkHashMessage(result, message)

    const decoded = caver.utils.utf8ToHex(message)
    result = caver.klay.accounts.hashMessage(decoded)
    checkHashMessage(result, message)
  })
})

describe('caver.klay.accounts.sign', () => {
  let account

  beforeEach(() => {
    account = caver.klay.accounts.create()
  })

  context('CAVERJS-UNIT-WALLET-033 : input: data, privateKey', () => {
    it('should recover valid address', () => {
      const data = 'Some data'
      let result = caver.klay.accounts.sign(data, account.privateKey)

      const keys = ['message', 'messageHash', 'v', 'r', 's', 'signature']
      expect(Object.getOwnPropertyNames(result)).to.deep.equal(keys)

      if (data != result.message) {
        expect(data).to.equal(caver.utils.utf8ToHex(result.message))
      }

      const decoded = caver.utils.utf8ToHex(data)
      result = caver.klay.accounts.sign(decoded, account.privateKey)
      checkHashMessage(result.messageHash, data)

      expect(caver.klay.accounts.recover(result)).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-034 : input: data, privateKey:invalid', () => {
    it('should throw an error', () => {
      const data = 'Some data'
      const invalid = caver.utils.randomHex(31)    // 31bytes

      const errorMessage = 'Invalid private key'
      expect(() => caver.klay.accounts.sign(data, invalid)).to.throw(errorMessage)
    })
  })
})

// caver.klay.accounts.recover
describe('caver.klay.accounts.recover', () => {
  let account

  beforeEach(() => {
    account = caver.klay.accounts.create()
  })

  context('CAVERJS-UNIT-WALLET-035 : input: signatureObject', () => {
    it('result should be same with account.address', () => {
      const message = 'Some data'
      const sigObj = account.sign(message)

      let result = caver.klay.accounts.recover(sigObj)
      expect(result).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-036 : input: message, signature', () => {
    it('result should be same with account.address', () => {
      const message = 'Some data'
      const sigObj = account.sign(message)

      let result = caver.klay.accounts.recover(sigObj.message, sigObj.signature)
      expect(result).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-037 : input: message, signature, prefixed', () => {
    it('result should be same with account.address', () => {
      const message = 'Some data'
      const sigObj = account.sign(message)
      const prefixed = true

      const messageHash = caver.klay.accounts.hashMessage(message)

      let result = caver.klay.accounts.recover(messageHash, sigObj.signature, prefixed)
      expect(result).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-038 : input: message, v, r, s', () => {
    it('result should be same with account.address', () => {
      const message = 'Some data'
      const sigObj = account.sign(message)

      let result = caver.klay.accounts.recover(sigObj.message, sigObj.v, sigObj.r, sigObj.s)
      expect(result).to.equal(account.address)
    })
  })

  context('CAVERJS-UNIT-WALLET-039 : input: message, v, r, s, prefixed', () => {
    it('result should be same with account.address', () => {
      const message = 'Some data'
      const sigObj = account.sign(message)
      const prefixed = true

      const messageHash = caver.klay.accounts.hashMessage(message)

      let result = caver.klay.accounts.recover(messageHash, sigObj.v, sigObj.r, sigObj.s, prefixed)
      expect(result).to.equal(account.address)
    })
  })
})

// caver.klay.accounts.encrypt
describe('caver.klay.accounts.encrypt', () => {
  let account

  beforeEach(() => {
    account = caver.klay.accounts.create()
  })

  context('CAVERJS-UNIT-WALLET-040 : input: privateKey, password', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'

      let result = caver.klay.accounts.encrypt(account.privateKey, password)

      isKeystoreV3(result, account)

      const decryptedAccount = caver.klay.accounts.decrypt(result, password)
      isAccount(decryptedAccount, account)
    })
  })

  context('CAVERJS-UNIT-WALLET-041 : input: privateKey:invalid, password', () => {
    it('should throw an error', () => {
      const invalid = caver.utils.randomHex(31)    // 31bytes
      const password = 'klaytn!@'

      const errorMessage = 'Invalid private key'
      expect(() => caver.klay.accounts.encrypt(invalid, password)).to.throw(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-096 : input: privateKey:KlaytnWalletKey, password', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'

      let result = caver.klay.accounts.encrypt(account.getKlaytnWalletKey(), password)

      isKeystoreV3(result, account)

      const decryptedAccount = caver.klay.accounts.decrypt(result, password)
      isAccount(decryptedAccount, account)
    })
  })

  context('CAVERJS-UNIT-WALLET-097 : input: privateKey:KlaytnWalletKey, password, {address:valid}', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'

      let result = caver.klay.accounts.encrypt(account.getKlaytnWalletKey(), password, {address: account.address})

      isKeystoreV3(result, account)

      const decryptedAccount = caver.klay.accounts.decrypt(result, password)
      isAccount(decryptedAccount, account)
    })
  })

  context('CAVERJS-UNIT-WALLET-098 : input: privateKey:KlaytnWalletKey, password, {address:invalid}', () => {
    it('should throw an error', () => {
      const password = 'klaytn!@'

      const errorMessage = 'The address extracted from the private key does not match the address received as the input value.'
      expect(() => caver.klay.accounts.encrypt(account.getKlaytnWalletKey(), password, {address: caver.klay.accounts.create().address})).to.throw(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-099 : input: privateKey:KlaytnWalletKey(decoupled), password', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'
      caver.klay.accounts.wallet.add(account)
      var updatedAccount = caver.klay.accounts.wallet.updatePrivateKey(caver.klay.accounts.create().privateKey, account.address)
      let result = caver.klay.accounts.encrypt(updatedAccount.getKlaytnWalletKey(), password)

      isKeystoreV3(result, updatedAccount)

      const decryptedAccount = caver.klay.accounts.decrypt(result, password)
      isAccount(decryptedAccount, updatedAccount)
    })
  })

  context('CAVERJS-UNIT-WALLET-100 : input: privateKey:KlaytnWalletKey(decoupled), password, {address:valid}', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'
      caver.klay.accounts.wallet.add(account)
      var updatedAccount = caver.klay.accounts.wallet.updatePrivateKey(caver.klay.accounts.create().privateKey, account.address)
      let result = caver.klay.accounts.encrypt(updatedAccount.getKlaytnWalletKey(), password, {address: updatedAccount.address})

      isKeystoreV3(result, updatedAccount)

      const decryptedAccount = caver.klay.accounts.decrypt(result, password)
      isAccount(decryptedAccount, updatedAccount)
    })
  })

  context('CAVERJS-UNIT-WALLET-101 : input: privateKey:KlaytnWalletKey(decoupled), password, {address:invalid}', () => {
    it('should encrypt password with privateKey', () => {
      const password = 'klaytn!@'
      caver.klay.accounts.wallet.add(account)
      var updatedAccount = caver.klay.accounts.wallet.updatePrivateKey(caver.klay.accounts.create().privateKey, account.address)

      const errorMessage = 'The address extracted from the private key does not match the address received as the input value.'
      expect(() => caver.klay.accounts.encrypt(updatedAccount.getKlaytnWalletKey(), password, {address: caver.klay.accounts.create().address})).to.throw(errorMessage)
    })
  })
})

describe('caver.klay.accounts.decrypt', () => {
  let account

  beforeEach(() => {
    account = caver.klay.accounts.create()
  })

  context('CAVERJS-UNIT-WALLET-042 : input: keystoreJsonV3, password', () => {
    it('After decrypting, should return valid account', () => {
      const password = 'klaytn!@'
      const keystoreJsonV3 = caver.klay.accounts.encrypt(account.privateKey, password)

      let result = caver.klay.accounts.decrypt(keystoreJsonV3, password)
      isKeystoreV3(keystoreJsonV3, result)

      isAccount(result, account)
    })
  })

  context('CAVERJS-UNIT-WALLET-103 : input: keystoreJsonV3(without 0x address format), password', () => {
    it('After decrypting, should return valid account', () => {
      const password = 'klaytn!@'
      const keystoreJsonV3 = caver.klay.accounts.encrypt(account.privateKey, password)
      keystoreJsonV3.address = keystoreJsonV3.address.replace('0x', '')
      
      let result = caver.klay.accounts.decrypt(keystoreJsonV3, password)
      
      expect(result.address.slice(0, 2)).to.equals('0x')
    })
  })

  /*
  it('keystoreJsonV3, password:invalid [KLAYTN-52]', () => {
    const invalid = ''
    const keystoreJsonV3 = caver.klay.accounts.encrypt(account.privateKey, invalid)

    utils.log('input', keystoreJsonV3, invalid)

    const expectedError = {
      name: 'Error',
      message: ''
    }
    validateErrorCodeblock(() => caver.klay.accounts.decrypt(keystoreJsonV3, invalid), expectedError)
  })
  */
})

describe('caver.klay.accounts.getLegacyAccount', () => {
  context('CAVERJS-UNIT-WALLET-106 : input: valid privateKey', () => {
    it('should return account which is derived from private key', () => {
      const testAccount = caver.klay.accounts.create()
      let result = caver.klay.accounts.getLegacyAccount(testAccount.privateKey)

      expect(result.klaytnWalletKeyAddress).to.equals('')
      expect(result.legacyAccount.address).to.equals(testAccount.address)
      expect(result.legacyAccount.privateKey).to.equals(testAccount.privateKey)
    })
  })

  context('CAVERJS-UNIT-WALLET-107 : input: nonDecoupled valid KlaytnWalletKey format', () => {
    it('should return account which is derived from private key and address from KlaytnWalletKey format', () => {
      const testAccount = caver.klay.accounts.create()
      let result = caver.klay.accounts.getLegacyAccount(testAccount.getKlaytnWalletKey())

      expect(result.klaytnWalletKeyAddress).to.equals(testAccount.address)
      expect(result.legacyAccount.address).to.equals(result.klaytnWalletKeyAddress)
      expect(result.legacyAccount.privateKey).to.equals(testAccount.privateKey)
    })
  })

  context('CAVERJS-UNIT-WALLET-108 : input: decoupled valid KlaytnWalletKey format', () => {
    it('should return account which is derived from private key and address from KlaytnWalletKey format', () => {
      // decoupled
      const testAccount = caver.klay.accounts.create()
      testAccount.privateKey = caver.klay.accounts.create().privateKey

      let result = caver.klay.accounts.getLegacyAccount(testAccount.getKlaytnWalletKey())

      expect(result.klaytnWalletKeyAddress).to.equals(testAccount.address)
      expect(result.legacyAccount.address).not.to.equals(result.klaytnWalletKeyAddress)
      expect(result.legacyAccount.privateKey).to.equals(testAccount.privateKey)
    })
  })

  context('CAVERJS-UNIT-WALLET-109 : input: invalid privateKey', () => {
    it('should throw error if input is invalid privateKey string', () => {
      const expectedError = 'Invalid private key'

      expect(() => caver.klay.accounts.getLegacyAccount('0x')).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount('1')).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount('a')).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140FF')).to.throws(expectedError)
    })

    it('should throw error if input is invalid privateKey type', () => {
      const expectedError = 'The private key must be of type string'

      expect(() => caver.klay.accounts.getLegacyAccount(1234)).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount({})).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount()).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount(undefined)).to.throws(expectedError)
      expect(() => caver.klay.accounts.getLegacyAccount(null)).to.throws(expectedError)
    })
  })

  context('CAVERJS-UNIT-WALLET-110 : input: invalid KlaytnWalletKey format', () => {
    it('should throw error if input is invalid KlaytnWalletKey string', () => {
      const expectedError = 'Invalid private key'
      expect(() => caver.klay.accounts.getLegacyAccount(caver.klay.accounts.create().privateKey+'0x000x00')).to.throws(expectedError)
    })
  })
})

describe('caver.klay.accounts.isDecoupled', () => {
  context('CAVERJS-UNIT-WALLET-111 : input: valid privateKey and decoupled address', () => {
    it('should return true if input is decoupled private and address', () => {
      const testAccount = caver.klay.accounts.create()
      testAccount.privateKey = caver.klay.accounts.create().privateKey
      expect(caver.klay.accounts.isDecoupled(testAccount.privateKey, testAccount.address)).to.be.true
    })
  })

  context('CAVERJS-UNIT-WALLET-112 : input: valid KlaytnWalletKey', () => {
    it('should return true if input is decoupled KlaytnWalletKey', () => {
      const testAccount = caver.klay.accounts.create()
      testAccount.privateKey = caver.klay.accounts.create().privateKey
      expect(caver.klay.accounts.isDecoupled(testAccount.getKlaytnWalletKey())).to.be.true
      expect(caver.klay.accounts.isDecoupled(testAccount.getKlaytnWalletKey(), testAccount.address)).to.be.true
    })
  })

  context('CAVERJS-UNIT-WALLET-113 : input: valid privateKey', () => {
    it('should return false if input is valid privateKey', () => {
      expect(caver.klay.accounts.isDecoupled(caver.klay.accounts.create().privateKey)).to.be.false
      expect(caver.klay.accounts.isDecoupled(caver.klay.accounts.create().privateKey.slice(2))).to.be.false
    })
  })

  context('CAVERJS-UNIT-WALLET-114 : input: valid KlaytnWalletKey', () => {
    it('should return true if input is nonDecoupled KlaytnWalletKey', () => {
      const testAccount = caver.klay.accounts.create()
      expect(caver.klay.accounts.isDecoupled(testAccount.getKlaytnWalletKey())).to.be.false
      expect(caver.klay.accounts.isDecoupled(testAccount.getKlaytnWalletKey(), testAccount.address)).to.be.false
    })
  })

  context('CAVERJS-UNIT-WALLET-115 : input: invalid privateKey', () => {
    it('should throw error if input is invalid privateKey string', () => {
      const expectedError = 'Invalid private key'

      expect(() => caver.klay.accounts.isDecoupled('0x')).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled('1')).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled('a')).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364140FF')).to.throws(expectedError)
    })

    it('should throw error if input is invalid privateKey type', () => {
      const expectedError = 'The private key must be of type string'

      expect(() => caver.klay.accounts.isDecoupled(1234)).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled({})).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled()).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled(undefined)).to.throws(expectedError)
      expect(() => caver.klay.accounts.isDecoupled(null)).to.throws(expectedError)
    })
  })

  context('CAVERJS-UNIT-WALLET-116 : input: not match address with KlaytnWalletKey and input', () => {
    it('should throw error if input is invalid privateKey string', () => {
      const testAccount = caver.klay.accounts.create()
      testAccount.privateKey = caver.klay.accounts.create().privateKey

      const expectedError = 'The address extracted from the private key does not match the address received as the input value.'

      expect(() => caver.klay.accounts.isDecoupled(testAccount.getKlaytnWalletKey(), caver.klay.accounts.create().address)).to.throws(expectedError)
    })
  })
})

describe('caver.klay.accounts.wallet', () => {

  it('CAVERJS-UNIT-WALLET-043 : should return valid wallet instance', () => {
    let result = caver.klay.accounts.wallet
    isWallet(result)

    const accounts = []
    const accountCount = Math.floor(Math.random() * 10) + 1
    for (let i = 0; i < accountCount; i++) {
      const account = caver.klay.accounts.create()
      accounts.push(account)
      caver.klay.accounts.wallet.add(account)
    }

    isWallet(result, { accounts })
  })
})

describe('caver.klay.accounts.wallet.create', () => {

  const validateCheckForWalletCreation = (result, numberOfAccounts) => {
    isWallet(result)
    expect(result.length).to.equal(numberOfAccounts)
    for (let i = 0; i < result.length; i++) {
      const accountByIndex = Object.assign({}, result[i])
      const accountByAddress = Object.assign({}, result[accountByIndex.address])

      delete accountByIndex.index
      delete accountByAddress.index

      isAccount(accountByIndex, { privateKey: accountByAddress.privateKey, address: accountByAddress.address })
      isAccount(accountByAddress, { privateKey: accountByIndex.privateKey, address: accountByIndex.address })
    }
  }

  context('CAVERJS-UNIT-WALLET-044 : input: numberOfAccounts', () => {
    it('should return valid wallet instance', () => {
      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      let result = caver.klay.accounts.wallet.create(numberOfAccounts)
      validateCheckForWalletCreation(result, numberOfAccounts)
    })
  })

  context('CAVERJS-UNIT-WALLET-045 : input: numberOfAccounts:invalid', () => {
    it('should return 0 wallet', () => {
      const invalid = -1
      let result = caver.klay.accounts.wallet.create(invalid)
      validateCheckForWalletCreation(result, 0)
    })
  })

  context('CAVERJS-UNIT-WALLET-046 : input: numberOfAccounts, entropy', () => {
    it('should return valid wallet instance', () => {
      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      const entropy = caver.utils.randomHex(32)

      let result = caver.klay.accounts.wallet.create(numberOfAccounts, entropy)
      validateCheckForWalletCreation(result, numberOfAccounts)
    })
  })
})

describe('caver.klay.accounts.wallet.add', () => {
  const validateCheckForWalletAddition = (data, { account, wallet }) => {
    const accounts = []  

    accounts.push(Object.assign({}, data))
    accounts.push(Object.assign({}, wallet[data.index]))
    accounts.push(Object.assign({}, wallet[data.address]))

    for (v of accounts) {
      delete v.index
      isAccount(v, { privateKey: account.privateKey, address: account.address })
    }
  }

  context('CAVERJS-UNIT-WALLET-047 : input: account', () => {
    it('should have valid wallet instance after addition', () => {
      let account = caver.klay.accounts.create()
      let result = caver.klay.accounts.wallet.add(account)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-048 : input: privateKey', () => {
    it('should have valid wallet instance after addition', () => {
      account = caver.klay.accounts.create()
      result = caver.klay.accounts.wallet.add(account.privateKey)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-052 : input: KlaytnWalletKey', () => {
    it('should have valid wallet instance after addition', () => {
      // KlaytnWalletkey with nonHumanReadableAddress
      var klaytnWalletKey = '0x600dfc414fe433881f6606c24955e4143df9d203ccb3e335efe970a4ad017d040x000xee135d0b57c7ff81b198763cfd7c43f03a5f7622'
      account = caver.klay.accounts.privateKeyToAccount(klaytnWalletKey)
      result = caver.klay.accounts.wallet.add(klaytnWalletKey)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })

      // KlaytnWalletkey with nonHumanReadableAddress (decoupled)
      var klaytnWalletKey = '0x600dfc414fe433881f6606c24955e4143df9d203ccb3e335efe970a4ad017d040x000x34ef488daef1da6fcc3470be0a5351dc223e20d0'
      account = caver.klay.accounts.privateKeyToAccount(klaytnWalletKey)
      result = caver.klay.accounts.wallet.add(klaytnWalletKey)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-050, CAVERJS-UNIT-WALLET-051 : input: privateKey, address', () => {
    it('should have valid wallet instance after addition', () => {
      account = caver.klay.accounts.create()
      result = caver.klay.accounts.wallet.add(account.privateKey, account.address)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })

      account = caver.klay.accounts.create()
      var address = '0xc98e2616b445d0b7ff2bcc45adc554ebbf5fd576'
      account.address = address
      result = caver.klay.accounts.wallet.add(account.privateKey, address)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })

      account = caver.klay.accounts.create()
      address = '0x6a61736d696e652e6b6c6179746e000000000000'
      account.address = address
      result = caver.klay.accounts.wallet.add(account.privateKey, address)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-053 CAVERJS-UNIT-WALLET-054 : input: KlaytnWalletKey, address', () => {
    it('should have valid wallet instance after addition', () => {
      klaytnWalletKey = '0xc1ad21b3da99cbb6a57cf181ec3e36af77ae37112585f700c81db19115f74b110x000xc4f88823f5030e4343c1494b502d534e9f15152d'
      account = caver.klay.accounts.privateKeyToAccount(klaytnWalletKey)
      result = caver.klay.accounts.wallet.add(klaytnWalletKey, account.address)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })

      // decoupled
      klaytnWalletKey = '0xc1ad21b3da99cbb6a57cf181ec3e36af77ae37112585f700c81db19115f74b110x000x95e024d64534948a89748d4c3e82e02d05721beb'
      account = caver.klay.accounts.privateKeyToAccount(klaytnWalletKey)
      result = caver.klay.accounts.wallet.add(klaytnWalletKey, account.address)

      validateCheckForWalletAddition(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-055 : input: KlaytnWalletKey, invalid address', () => {
    it('should have valid wallet instance after addition', () => {
      klaytnWalletKey = '0x2d21dc5d73e29177af17a1376f3e5769b94086479735e711670c2d599c3f97ab0x000x53b0e6ebd395093d83ac9b0e1e47b4b31b7c18c4'
      account = caver.klay.accounts.privateKeyToAccount(klaytnWalletKey)
      expect(()=> caver.klay.accounts.wallet.add(klaytnWalletKey, '0x95e024d64534948a89748d4c3e82e02d05721beb')).to.throw()
    })
  })

  context('CAVERJS-UNIT-WALLET-056 : input: invalid KlaytnWalletKey', () => {
    it('should have valid wallet instance after addition', () => {
      klaytnWalletKey = '0x39d87f15c695ec94d6d7107b48dee85e252f21fedd371e1c6badc4afa71efbdf0x010x167bcdef96658b7b7a94ac398a8e7275e719a10c'
      expect(()=> caver.klay.accounts.wallet.add(klaytnWalletKey)).to.throw()
    })
  })

  context('CAVERJS-UNIT-WALLET-049 : input: account:invalid', () => {
    it('should throw an error', () => {
      const invalid = -1
      const errorMessage = 'Invalid private key'
      expect(() => caver.klay.accounts.wallet.add(invalid)).to.throw(errorMessage)
    })
  })
})

describe('caver.klay.accounts.wallet.remove', () => {

  const validateCheckForWalletRemove = (data, { expected=true, account, wallet }) => {
    expect(data).to.equal(expected)

    if (data) {
      expect(typeof wallet[account.address]).to.equal('undefined')
    }
  }

  context('CAVERJS-UNIT-WALLET-057, CAVERJS-UNIT-WALLET-058, CAVERJS-UNIT-WALLET-059 : input: account', () => {
    it('should remove wallet instance', () => {
      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      caver.klay.accounts.wallet.create(numberOfAccounts)

      let account = caver.klay.accounts.wallet[Math.floor(Math.random() * numberOfAccounts)]

      let result = caver.klay.accounts.wallet.remove(account.index)
      validateCheckForWalletRemove(result, { account: account, wallet: caver.klay.accounts.wallet })

      account = caver.klay.accounts.create()
      caver.klay.accounts.wallet.add(account.privateKey)

      result = caver.klay.accounts.wallet.remove(account.address)
      validateCheckForWalletRemove(result, { account: account, wallet: caver.klay.accounts.wallet })
    })
  })

  context('CAVERJS-UNIT-WALLET-060 : input: account:invalid', () => {
    it('should return false for removing invalid wallet instance index', () => {
      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      caver.klay.accounts.wallet.create(numberOfAccounts)

      let invalid = -1
      let result = caver.klay.accounts.wallet.remove(invalid)
      validateCheckForWalletRemove(result, { expected: false })

      invalid = numberOfAccounts
      result = caver.klay.accounts.wallet.remove(invalid)
      validateCheckForWalletRemove(result, { expected: false })
    })
  })
})

describe('caver.klay.accounts.wallet.clear', () => {
  context('CAVERJS-UNIT-WALLET-061 : input: no parameter', () => {
    it('should clear all wallet instance', () => {
      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      caver.klay.accounts.wallet.create(numberOfAccounts)

      let result = caver.klay.accounts.wallet.clear()
      isWallet(result)
      expect(result.length).to.equal(0)
      expect(caver.klay.accounts.wallet.length).to.equal(0)

      result = caver.klay.accounts.wallet.clear()
      isWallet(result)
      expect(result.length).to.equal(0)
      expect(caver.klay.accounts.wallet.length).to.equal(0)
    })
  })
})

describe('caver.klay.accounts.wallet.encrypt', () => {

  context('CAVERJS-UNIT-WALLET-062 : input: password', () => {
    it('should encrypted as v3Keystore', () => {
      const password = 'klaytn!@'

      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      caver.klay.accounts.wallet.create(numberOfAccounts)

      let result = caver.klay.accounts.wallet.encrypt(password)

      expect(result.length).to.equal(caver.klay.accounts.wallet.length)
      result.forEach((v, i) => {
        isKeystoreV3(v, { address: caver.klay.accounts.wallet[i].address })
      })
      const decryptedWallet = caver.klay.accounts.wallet.decrypt(result, password)
      isWallet(decryptedWallet, { accounts: caver.klay.accounts.wallet })
    })
  })

  /*
  it('password:invalid [KLAYTN-52]', () => {
    const invalid = ''

    const numberOfAccounts = Math.floor(Math.random() * 5) + 1
    caver.klay.accounts.wallet.create(numberOfAccounts)

    utils.log('input', invalid)

    const expectedError = {
      name: 'Error',
      message: ''
    }
    validateErrorCodeblock(() => caver.klay.accounts.wallet.encrypt(invalid), expectedError)
  })
  */
})

describe('caver.klay.accounts.wallet.decrypt', () => {

  context('CAVERJS-UNIT-WALLET-063 : input: keystoreArray, password', () => {
    it('should decrypt v3Keystore to account instance', () => {
      const password = 'klaytn!@'

      const numberOfAccounts = Math.floor(Math.random() * 5) + 1
      caver.klay.accounts.wallet.create(numberOfAccounts)

      const encryptedKeystore = caver.klay.accounts.wallet.encrypt(password)
      caver.klay.accounts.wallet.clear()

      const result = caver.klay.accounts.wallet.decrypt(encryptedKeystore, password)
      isWallet(result, { accounts: caver.klay.accounts.wallet })
    })
  })

  /*
  it('keystoreArray, password:invalid [KLAYTN-52]', () => {
    const invalid = ''

    const numberOfAccounts = Math.floor(Math.random() * 5) + 1
    caver.klay.accounts.wallet.create(numberOfAccounts)

    const encryptedKeystore = caver.klay.accounts.wallet.encrypt(invalid)

    utils.log('input', encryptedKeystore, invalid)

    const expectedError = {
      name: 'Error',
      message: ''
    }
    validateErrorCodeblock(() => caver.klay.accounts.wallet.decrypt(encryptedKeystore, invalid), expectedError)
  })
  */
})

describe('caver.klay.accounts.wallet.getAccount', () => {
  context('CAVERJS-UNIT-WALLET-125 : input: number', () => {
    it('should return Account from Wallet', () => {
      const testAccount = caver.klay.accounts.wallet.add(caver.klay.accounts.create())

      const fromWallet = caver.klay.accounts.wallet.getAccount(testAccount.index)

      expect(testAccount.address).to.equals(fromWallet.address)
      expect(testAccount.privateKey).to.equals(fromWallet.privateKey)
      expect(testAccount.index).to.equals(fromWallet.index)
    })
  })

  context('CAVERJS-UNIT-WALLET-126 : input: invalid number index', () => {
    it('should throw Error', () => {
      const errorMessage = `The index(${caver.klay.accounts.wallet.length}) is out of range(Wallet length : ${caver.klay.accounts.wallet.length}).`

      expect(() => caver.klay.accounts.wallet.getAccount(caver.klay.accounts.wallet.length)).to.throws(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-127 : input: invalid parameter type for getAccount', () => {
    it('should throw Error', () => {
      const errorMessage = `Accounts in the Wallet can be searched by only index or address.`

      expect(() => caver.klay.accounts.wallet.getAccount({})).to.throws(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-128 : input: invalid address for getAccount', () => {
    it('should throw Error', () => {
      const input = 'address'
      const errorMessage = `Failed to getAccount from Wallet: invalid address(${input})`

      expect(() => caver.klay.accounts.wallet.getAccount(input)).to.throws(errorMessage)
    })
  })

  context('CAVERJS-UNIT-WALLET-129 : input: validAddress', () => {
    it('should return Account from Wallet', () => {
      const testAccount = caver.klay.accounts.wallet.add(caver.klay.accounts.create())

      let fromWallet = caver.klay.accounts.wallet.getAccount(testAccount.address)

      expect(testAccount.address).to.equals(fromWallet.address)
      expect(testAccount.privateKey).to.equals(fromWallet.privateKey)
      expect(testAccount.index).to.equals(fromWallet.index)

      fromWallet = caver.klay.accounts.wallet.getAccount(testAccount.address.toLowerCase())

      expect(testAccount.address).to.equals(fromWallet.address)
      expect(testAccount.privateKey).to.equals(fromWallet.privateKey)
      expect(testAccount.index).to.equals(fromWallet.index)

      fromWallet = caver.klay.accounts.wallet.getAccount(testAccount.address.toUpperCase())

      expect(testAccount.address).to.equals(fromWallet.address)
      expect(testAccount.privateKey).to.equals(fromWallet.privateKey)
      expect(testAccount.index).to.equals(fromWallet.index)
    })
  })
})