#!/usr/bin/env node
const commander = require('commander');
const program = new commander.Command();
const fs = require("fs")
const stateFile = "state.json"
const dataFile = "database.json"
const rawUserData = fs.readFileSync(dataFile, { encoding: 'utf8', flag: 'r' })
const Users = JSON.parse(rawUserData).Users
const rawStateData = fs.readFileSync(stateFile, { encoding: 'utf8', flag: 'r' })
let state = JSON.parse(rawStateData)

function loginMessage(name, balance) {
    console.log(`Welcome ${name}!`)
    console.log(`Your Balance is Rs. ${balance}`)
}
function taskToMessage(task, amount, name) {
    console.log(`${task} Rs. ${amount} to ${name} `)
}
function oweFromMessage(amount, name) {
    console.log(`Owed ${amount} from ${name}`)
}
function saveData() {
    let tempData = { Users: Users }
    let writeFileData = JSON.stringify(tempData)
    fs.writeFileSync(dataFile, writeFileData, 'utf-8')
}
function saveState() {
    let writeFileData = JSON.stringify(state)
    fs.writeFileSync(stateFile, writeFileData, 'utf-8')
}
function showBalance() {
    console.log(`Your Balance is Rs. ${Users[state.index].balance}`)
}

program
    .command("login")
    .argument('<user>')
    .action(async (user) => {
        state.isLoggedIn = true
        state.currentUser = user
        let result = Users.find((ele, index) => {
            if (ele.name == user) {
                state.index = index
                return ele
            }
        })
        if (result) {
            loginMessage(result.name, result.balance)
            if (result.oweTo.length) {
                Users[state.index].oweTo = Users[state.index].oweTo.filter(x => {
                    if (x.amount != 0) {
                        taskToMessage("Owe", x.amount, Users[x.index].name)
                        return x
                    }
                })
                saveData()
            }
            if (result.oweFrom.length) {
                Users[state.index].oweFrom = result.oweFrom.filter(element => {
                    if (element.amount != 0) {
                        oweFromMessage(element.amount, Users[element.index].name)
                        return element
                    }
                })
            }
            saveState()
        } else {
            let data2 = {
                id: Users[Users.length - 1].id + 1,
                name: user,
                balance: 0,
                oweTo: [],
                oweFrom: []
            }
            Users.push(data2)
            state.index = Users.length - 1
            saveData()
            saveState()
            loginMessage(data2.name, data2.balance)
        }
    })

program
    .command("logout")
    .action(() => {
        console.log(`Goodbye, ${state.currentUser}!`)
        state = {
            index: null,
            currentUser: null
        }
        saveState()
    })
program
    .command("withdraw")
    .argument("<amount>")
    .action((amount) => {
        if (parseFloat(amount) > Users[state.index].balance) {
            console.log("Error! Please enter amount within your account balance.")
            showBalance()
        } else {
            Users[state.index].balance -= parseFloat(amount)
            showBalance()
        }
        saveData()
    })
program
    .command("deposite")
    .argument("<amount>")
    .action((amount) => {
        let deposit = parseFloat(amount)
        if (Users[state.index].oweTo.length) {
            Users[state.index].oweTo.forEach(element => {
                if (deposit > element.amount) {
                    deposit -= element.amount
                    Users[element.index].oweFrom = Users[element.index].oweFrom.filter((ele) => ele.index != state.index)
                    Users[element.index].balance += element.amount
                    taskToMessage("Transferred", element.amount, Users[element.index].name)
                    element.amount = 0
                    element.index = null
                } else {
                    element.amount -= deposit
                    Users[element.index].oweFrom.forEach((ele) => {
                        if (ele.index == state.index) {
                            ele.amount = element.amount
                        }
                    })
                    Users[element.index].balance += deposit
                    taskToMessage("Transferred", deposit, Users[element.index].name)
                    taskToMessage("Owe", element.amount, Users[element.index].name)
                    deposit = 0
                }
                saveData()
            })
            Users[state.index].balance += deposit
            Users[state.index].oweTo = Users[state.index].oweTo.filter(x => x.amount != 0)
            saveData()
            showBalance()
        } else {
            Users[state.index].balance += deposit
            saveData()
            showBalance()
        }

    })

program
    .command("transfer")
    .argument("<name>")
    .argument("<[amount]>")
    .action((name, amount) => {
        let otherParty = {}
        let transferAmount = parseFloat(amount)
        let target = Users.findIndex((ele, index) => {
            if (ele.name == name) {
                otherParty.name = ele.name
                otherParty.index = index
            }
        })
        if (!otherParty.name) {
            let data2 = {
                id: Users[Users.length - 1].id + 1,
                name: name,
                balance: 0,
                oweTo: [],
                oweFrom: []
            }
            Users.push(data2)
            otherParty.name = data2.name
            otherParty.index = Users.length - 1
        }
        if (Users[state.index].oweFrom.length) {
            Users[state.index].oweFrom.forEach(element => {
                if (element.index == otherParty.index) {
                    if (transferAmount >= element.amount) {
                        if (transferAmount > Users[state.index].balance) {
                            let remainingAmount = transferAmount - element.amount
                            let availableTransAmount =
                                taskToMessage("Transferred", element.amount, otherParty.name)
                            element.amount = 0
                            Users[state.index].balance = 0
                            Users[state.index].oweTo.push({ index: otherParty.index, amount: remainingAmount })
                            Users[otherParty.index].oweFrom.push({ index: state.index, amount: remainingAmount })
                            taskToMessage("Owe", remainingAmount, otherParty.name)
                            showBalance()
                            saveData()
                        } else {
                            let remainingAmount = transferAmount - element.amount
                            element.amount = 0
                            Users[otherParty.index].balance += remainingAmount
                            Users[state.index].balance -= remainingAmount
                            Users[otherParty.index].oweTo = Users[otherParty.index].oweFrom.filter(e => e.index != state.index)
                            taskToMessage("Transferred", transferAmount, otherParty.name)
                            showBalance()
                            saveData()
                        }
                    } else {
                        element.amount -= transferAmount
                        taskToMessage('Transferred', transferAmount, otherParty.name)
                        Users[otherParty.index].oweTo.forEach(ele => {
                            if (ele.index == state.index) {
                                ele.amount -= transferAmount
                                oweFromMessage(ele.amount, otherParty.name)
                            }
                        })

                        showBalance()
                        saveData()
                    }
                }
            })
            Users[otherParty.index].oweFrom.filter(x => x.amount != 0)
        } else if (Users[state.index].oweTo.length) {
            if (transferAmount >= Users[state.index].balance) {
                let availableTransAmount = Users[state.index].balance
                let remainingAmount = transferAmount - availableTransAmount
                Users[otherParty.index].balance += availableTransAmount
                Users[state.index].balance -= availableTransAmount
                availableTransAmount && taskToMessage("Transferred", availableTransAmount, otherParty.name)
                showBalance()
                Users[state.index].oweTo.forEach(ele => {
                    if (ele.index == otherParty.index) {
                        ele.amount += remainingAmount
                        taskToMessage("Owed", ele.amount, otherParty.name)
                    }
                })
                Users[otherParty.index].oweFrom.forEach((element => {
                    if (element.index == state.index) {
                        element.amount += remainingAmount
                    }
                }))
                saveData()
            } else {
                Users[state.index].balance -= transferAmount
                taskToMessage("Transferred", transferAmount, otherParty.name)
                showBalance()
                Users[state.index].oweTo.forEach(ele => {
                    if (ele.index == otherParty.index) {
                        ele.amount -= transferAmount
                        taskToMessage("Owed", ele.amount, otherParty.name)
                    }
                })
                Users[otherParty.index].oweFrom.forEach((element => {
                    if (element.index == state.index) {
                        element.amount -= transferAmount
                    }
                }))
                saveData()
            }

        } else {
            if (transferAmount >= Users[state.index].balance) {
                let remainingAmount = transferAmount - Users[state.index].balance
                Users[otherParty.index].balance += Users[state.index].balance
                taskToMessage("Transferred", Users[state.index].balance, otherParty.name)
                Users[state.index].balance = 0
                Users[otherParty.index].oweFrom.push({ index: state.index, amount: remainingAmount })
                Users[state.index].oweTo.push({ index: otherParty.index, amount: remainingAmount })
                showBalance()
                taskToMessage("Owed", remainingAmount, otherParty.name)
                saveData()

            } else {
                Users[state.index].balance -= transferAmount
                Users[otherParty.index].balance += transferAmount
                taskToMessage("Transferred", transferAmount, otherParty.name)
                showBalance()
            }
        }
        Users[state.index].oweTo.filter(x => x.amount != 0)
        Users[otherParty.index].oweFrom.filter(x => x.amount != 0)
        Users[state.index].oweFrom.filter(x => x.amount != 0)
        Users[otherParty.index].oweTo.filter(x => x.amount != 0)
        otherParty = {}
        saveData()

    })

program
    .command('serve', { isDefault: true })
    .action((options) => {
        console.log(`Welcome to mahir-node-cli-ATM`);
        console.log(`Please login to use services`);
    });

program
    .command("show users")
    .action(() => {
        Users.forEach(ele => console.log(ele))
    })

program.parse(process.argv);