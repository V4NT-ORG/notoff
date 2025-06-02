import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
//import { Router, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { observer , inject } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

import Front from './screen/Front';
import Feed from './screen/Feed';
import Home from './screen/Home';
import GroupCreate from './screen/GroupCreate';
import GroupPay from './screen/GroupPay';
import GroupDetail from './screen/GroupDetail';
import GroupList from './screen/GroupList'; 
import UserDetail from './screen/UserDetail'; 
import GroupContribute from './screen/GroupContribute'; 
import FeedDetail from './screen/FeedDetail'; 
import GroupMember from './screen/GroupMember'; 
import Settings from './screen/Settings'; 
import GroupSettings from './screen/GroupSettings'; 
import Test from './screen/Test'; 
import Notice from './screen/Notice'; 
import SearchResultsScreen from './screen/SearchResultsScreen'; // Import the new screen


// import history from './util/History';

const FullView = styled.div`
  min-height:100vh;
  background-color: var(--app-bg-color); // Use CSS variable
  color: var(--app-text-color); // Set default text color
  /* background:url( https://konachan.com/sample/2eebff24bd213ca4cd63e71a88892ba5/Konachan.com%20-%20266207%20sample.jpg) fixed; */
`;

@inject("store") // Ensure store is injected if not already
@observer // Ensure component observes store changes for dark mode
class App extends Component {
  componentDidMount() {
    // Ensure the dark mode class is applied on initial load based on store state
    // This is also done in AppState constructor, but good to have here if App mounts later
    this.props.store.applyDarkModeClass();
  }

  render() {
    return (
      <FullView>
      <Router > 
        <Switch>
          <Route path="/test" component={Test} />
          <Route path="/search" component={SearchResultsScreen} /> 
          
          <Route path="/login" component={Front} />
          <Route path="/register" component={Front} />
          
          <Route path="/notice" component={Notice} />
          
          <Route path="/home/:filter" component={Home} />
          <Route path="/home" component={Home} />
          
          <Route path="/settings/:filter" component={Settings} />

          <Route path="/feed/:id" component={FeedDetail} />
          <Route path="/feed" component={Feed} />
          
          <Route path="/user/:filter/:id" component={UserDetail} />
          <Route path="/user/:id" component={UserDetail} />
          <Route path="/user" component={UserDetail} />
          
          <Route path="/group/contribute/:filter" component={GroupContribute} />
          <Route path="/group/settings/:id" component={GroupSettings} />
          <Route path="/group/contribute" component={GroupContribute} />
          
          <Route path="/group/member/:filter/:id" component={GroupMember} />
          <Route path="/group/member/:id" component={GroupMember} />

          <Route path="/group/create" component={GroupCreate} />
          <Route path="/group/pay/:id" component={GroupPay} />
          
          {/* 这里的顺序很重要，不能乱改 */}
          <Route path="/group/:filter/:id" component={GroupDetail} />
          <Route path="/group/:id" component={GroupDetail} />
          
          <Route path="/group/list" component={GroupList} />
          <Route path="/group" component={GroupList} />
          {/* <Route path="/home" component={Home} /> // Duplicate, ensure one Home route */}
          <Route exact path="/" component={Home} /> {/* Ensure Home is exact to avoid matching /search etc. */}
          
        </Switch>
      </Router>
      {/* <DevTools/> */}
      </FullView>  
    );
  }
}

export default App;
