# Project Silica

Project Silica is a working anti-DDoS tool created by David Hucks.  It has been tested and works on Ubuntu 20.04/22.04 and Debian 10/11.  It works perfectly fine with apache and Plesk managed servers.

With limited time on my hands, I've stopped working on this project for a while now (since April 2023), but it can be customized to work on any install.  As of now it works with ufw, and will install and enable ufw if it isn't already.  Keep this in mind if the OS uses a custom firewall.

Visit [ProjectSilica.com](https://projectsilica.com/).

## Features

- Auto install and update when opening
- Registers as a system process that autostarts on bootup
- Runs in the background
- Works great against DoS and DDoS attacks without slowing down processes
- Instantly blocks and disconnects offenders

## Installation

Simply opening the binary will install or update the application if it isn't already: `./projectsilica`.

## Usage

`projectsilica -l` Install license key
`projectsilica -u` Uninstall Project Silica
`projectsilica -v` Run Project Silica in verbose mode for a specified amount of seconds.  If no time is provided it's defaulted to 30 seconds.  The application will continue to run in the background.

## Side notes

As you can see, I have even set this up to accept payments from Stripe.  This feature is 90% complete, but would need some additional work.  I give you the rights to do what you wish with this code.

## Credits

- David Hucks
- Bang Energy Drink
- Our Lord, Jesus Christ, through Him all things are possible.